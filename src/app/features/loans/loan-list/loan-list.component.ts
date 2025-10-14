import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { LoanService } from '../../../core/services/loan.service';
import { Loan } from '../../../core/models';
import { LoanFormComponent } from '../loan-form/loan-form.component';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-loan-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './loan-list.component.html',
  styleUrls: ['./loan-list.component.css']
})
export class LoanListComponent implements OnInit {
  displayedColumns: string[] = ['id', 'customer', 'loanDate', 'amount', 'currentBalance', 'paymentInfo', 'status', 'actions'];
  loans: Loan[] = [];
  loading = true;

  constructor(
    private loanService: LoanService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadLoans();
  }

  loadLoans(): void {
    this.loading = true;
    this.loanService.getAll().subscribe({
      next: (loans: Loan[]) => {
        this.loans = loans.filter(loan =>
          (loan.status === 'ACTIVE' || loan.status === 'OVERDUE') && parseFloat(loan.currentBalance || '0') > 0
        );
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading loans:', error);
        this.loading = false;
        Swal.fire('Error', 'No se pudieron cargar los préstamos', 'error');
      }
    });
  }

  refreshLoans(): void {
    this.loadLoans();
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(LoanFormComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadLoans();
      }
    });
  }

  viewLoanDetails(loan: Loan): void {
    this.router.navigate(['/loans', loan.id]);
  }

  viewPaymentHistory(loan: Loan): void {
    Swal.fire({
      title: `Historial de Pagos - Préstamo #${loan.id}`,
      html: this.generatePaymentHistoryHTML(loan),
      width: '800px',
      showCloseButton: true,
      showConfirmButton: false,
      customClass: {
        popup: 'payment-history-popup'
      }
    });
  }

  calculateProjection(loan: Loan): void {
    const monthlyPayment = this.getMonthlyPayment(loan);
    const remainingBalance = parseFloat(loan.currentBalance || '0');
    const monthsToPayOff = Math.ceil(remainingBalance / monthlyPayment);
    const totalInterest = monthsToPayOff * monthlyPayment - remainingBalance;

    Swal.fire({
      title: 'Proyección de Pagos',
      html: `
        <div class="projection-details">
          <p><strong>Saldo actual:</strong> ${remainingBalance.toLocaleString('es-MX', {style: 'currency', currency: 'MXN'})}</p>
          <p><strong>Pago mensual mínimo:</strong> ${monthlyPayment.toLocaleString('es-MX', {style: 'currency', currency: 'MXN'})}</p>
          <p><strong>Meses para liquidar:</strong> ${monthsToPayOff} meses</p>
          <p><strong>Interés total estimado:</strong> ${totalInterest.toLocaleString('es-MX', {style: 'currency', currency: 'MXN'})}</p>
          <hr>
          <small><em>* Proyección basada en pagos mínimos mensuales constantes</em></small>
        </div>
      `,
      icon: 'info'
    });
  }

  editLoan(loan: Loan): void {
    Swal.fire('Información', 'Función de edición en desarrollo', 'info');
  }

  deleteLoan(loan: Loan): void {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `¿Deseas eliminar el préstamo #${loan.id}? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed && loan.id) {
        this.loanService.delete(loan.id).subscribe({
          next: () => {
            Swal.fire('Eliminado', 'El préstamo ha sido eliminado.', 'success');
            this.loadLoans();
          },
          error: (error: any) => {
            Swal.fire('Error', 'No se pudo eliminar el préstamo.', 'error');
          }
        });
      }
    });
  }

  formatLoanId(id: number): string {
    return `#${id.toString().padStart(4, '0')}`;
  }

  // Métodos de utilidad para colores y estados

  /**
   * Determina si el préstamo está esperando su primer pago (estado amarillo)
   * Solo se considera "primer período" si no ha habido ningún pago aún
   */
  isWaitingFirstPayment(loan: Loan): boolean {
    return (loan.monthsPaid || 0) === 0 && !this.isPastCutoffDate(loan);
  }

  /**
   * Determina si ya pasó la fecha de corte y no se ha registrado el pago correspondiente
   */
  isPastCutoffDate(loan: Loan): boolean {
    const today = new Date();
    const loanDate = new Date(loan.loanDate);
    const lastPaymentDate = loan.lastPaymentDate ? new Date(loan.lastPaymentDate) : null;

    // Determinar la fecha de referencia (último pago o fecha del préstamo)
    const referenceDate = lastPaymentDate || loanDate;

    // Préstamos Indefinidos: fecha de corte basada en día del préstamo + 2 días
    if (loan.loanType === 'Indefinido') {
      return this.isAfterCutoffIndefinido(today, loanDate, lastPaymentDate);
    }

    // Préstamos Cápsula
    const isQuincenal = loan.modality === 'quincenas';

    if (isQuincenal) {
      // Para quincenal: fechas de corte son día 17 y día 2
      return this.isAfterCutoffQuincenal(today, referenceDate);
    } else {
      // Para mensual: fecha de corte es día 2 de cada mes
      return this.isAfterCutoffMensual(today, referenceDate);
    }
  }

  /**
   * Verifica si estamos después de la fecha de corte para préstamos Indefinidos
   * Fecha de corte: día del préstamo + 2 días de tolerancia, cada mes
   */
  private isAfterCutoffIndefinido(today: Date, loanDate: Date, lastPaymentDate: Date | null): boolean {
    // Calcular el día de corte: día del préstamo + 2 días
    const loanDay = loanDate.getDate();
    const cutoffDay = loanDay + 2;

    // Si no ha pagado nunca, la primera fecha de corte es el mes siguiente
    if (!lastPaymentDate) {
      const firstCutoffDate = new Date(loanDate.getFullYear(), loanDate.getMonth() + 1, cutoffDay);
      return today > firstCutoffDate;
    }

    // Si ya pagó, calcular la siguiente fecha de corte desde el último pago
    const lastPaymentMonth = lastPaymentDate.getMonth();
    const lastPaymentYear = lastPaymentDate.getFullYear();

    // La siguiente fecha de corte es el mismo día de corte del mes siguiente
    const nextCutoffDate = new Date(lastPaymentYear, lastPaymentMonth + 1, cutoffDay);

    return today > nextCutoffDate;
  }

  /**
   * Verifica si estamos después de la fecha de corte quincenal (Cápsula)
   * Lógica basada en el día del préstamo:
   * - Día 1-9: Primera fecha corte día 15 del mismo mes
   * - Día 10-14: Primera fecha corte último día del mismo mes
   * - Día 15-24: Primera fecha corte último día del mismo mes
   * - Día 25-31: Primera fecha corte día 15 del siguiente mes
   */
  private isAfterCutoffQuincenal(today: Date, referenceDate: Date): boolean {
    const refDay = referenceDate.getDate();
    const refMonth = referenceDate.getMonth();
    const refYear = referenceDate.getFullYear();

    let nextCutoffDate: Date;

    // Determinar la siguiente fecha de corte basada en la fecha de referencia
    if (refDay >= 1 && refDay <= 9) {
      // Primera fecha: día 15 del mismo mes
      nextCutoffDate = new Date(refYear, refMonth, 15);
    } else if (refDay >= 10 && refDay <= 14) {
      // Primera fecha: último día del mismo mes
      nextCutoffDate = new Date(refYear, refMonth + 1, 0);
    } else if (refDay >= 15 && refDay <= 24) {
      // Primera fecha: último día del mismo mes
      nextCutoffDate = new Date(refYear, refMonth + 1, 0);
    } else { // día 25-31
      // Primera fecha: día 15 del siguiente mes
      nextCutoffDate = new Date(refYear, refMonth + 1, 15);
    }

    return today > nextCutoffDate;
  }

  /**
   * Verifica si estamos después de la fecha de corte mensual (Cápsula)
   * Lógica basada en el día del préstamo:
   * - Día 1-24: Primera fecha corte último día del mismo mes
   * - Día 25-31: Primera fecha corte último día del siguiente mes
   */
  private isAfterCutoffMensual(today: Date, referenceDate: Date): boolean {
    const refDay = referenceDate.getDate();
    const refMonth = referenceDate.getMonth();
    const refYear = referenceDate.getFullYear();

    let nextCutoffDate: Date;

    if (refDay >= 1 && refDay <= 24) {
      // Primera fecha: último día del mismo mes
      nextCutoffDate = new Date(refYear, refMonth + 1, 0);
    } else { // día 25-31
      // Primera fecha: último día del siguiente mes
      nextCutoffDate = new Date(refYear, refMonth + 2, 0);
    }

    return today > nextCutoffDate;
  }

  /**
   * Determina si el préstamo ha pagado a tiempo antes de la fecha de corte
   */
  hasPaidOnTime(loan: Loan): boolean {
    if ((loan.monthsPaid || 0) === 0) {
      return false; // No ha pagado aún
    }

    const lastPaymentDate = loan.lastPaymentDate ? new Date(loan.lastPaymentDate) : null;
    if (!lastPaymentDate) {
      return false;
    }

    // Si ya pagó y aún no ha pasado la siguiente fecha de corte, está al corriente (verde)
    return !this.isPastCutoffDate(loan);
  }

  isLoanOverdue(loan: Loan): boolean {
    // Está en adeudo si no ha pagado el primer período y ya pasó la fecha de corte
    // O si ya pagó pero pasó la fecha de corte del siguiente período
    return this.isPastCutoffDate(loan);
  }

  isLoanCurrent(loan: Loan): boolean {
    return loan.status === 'ACTIVE';
  }

  getRowClass(loan: Loan): string {
    if (loan.status === 'PAID') return 'row-paid';
    if (this.isLoanOverdue(loan)) return 'row-overdue';
    if (this.hasPaidOnTime(loan)) return 'row-current';
    if (this.isWaitingFirstPayment(loan)) return 'row-pending';
    return 'row-overdue';
  }

  getRowTooltip(loan: Loan): string {
    if (loan.status === 'PAID') return 'Préstamo completamente pagado';
    if (this.isLoanOverdue(loan)) return `Adeudo - Ya pasó la fecha de corte sin registrar pago`;
    if (this.hasPaidOnTime(loan)) return 'Al corriente - Pago realizado a tiempo';
    if (this.isWaitingFirstPayment(loan)) return 'Esperando primer pago';
    return 'Pendiente de pago';
  }

  getStatusClass(loan: Loan): string {
    if (loan.status === 'PAID') return 'status-paid';
    if (this.isWaitingFirstPayment(loan)) return 'status-pending'; // Amarillo
    if (this.isLoanOverdue(loan)) return 'status-overdue'; // Rojo
    if (this.hasPaidOnTime(loan)) return 'status-current'; // Verde
    return 'status-pending';
  }



  getStatusText(loan: Loan): string {
    if (loan.status === 'PAID') return 'Pagado';

    const periodUnit = loan.modality === 'quincenas' ? 'quincena' : (loan.modality === 'meses' ? 'mes' : 'mes');

    if (this.isWaitingFirstPayment(loan)) {
      return `1º ${periodUnit}`;
    }

    if (this.isLoanOverdue(loan)) {
      return 'Adeudo';
    }

    if (this.hasPaidOnTime(loan)) {
      return 'Al corriente';
    }

    return 'Al corriente';
  }

  getBalanceClass(loan: Loan): string {
    const currentBalance = parseFloat(loan.currentBalance || '0');
    if (currentBalance <= 0) return 'text-success';
    if (this.isLoanOverdue(loan)) return 'text-danger';
    return 'text-primary';
  }

  // Métodos de cálculo
  getMonthlyPayment(loan: Loan): number {
    return parseFloat(loan.currentBalance || '0') * 0.05;
  }

  getPaymentProgress(loan: Loan): number {
    const paid = parseFloat(loan.totalCapitalPaid || '0');
    const total = parseFloat(loan.amount || '1');
    return Math.round((paid / total) * 100);
  }

  getDaysAgo(date: string | Date): number {
    const loanDate = new Date(date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - loanDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysSinceLastPayment(loan: Loan): number {
    if (!loan.lastPaymentDate) {
      return this.getDaysAgo(loan.loanDate);
    }
    return this.getDaysAgo(loan.lastPaymentDate);
  }

  

  // Métodos para estadísticas
  getActiveLoansCount(): number {
    return this.loans.length - this.getCurrentLoansCount();
  }

  getCurrentLoansCount(): number {
    return this.loans.filter(l => this.isLoanCurrent(l)).length;
  }

  getOverdueLoansCount(): number {
    return this.loans.filter(l => this.isLoanOverdue(l)).length;
  }

  private generatePaymentHistoryHTML(loan: Loan): string {
    const termInfo = loan.term === null
      ? `<p><strong>Plazos:</strong> ${loan.monthsPaid || 0} / Indefinido</p>`
      : `<p><strong>Plazos:</strong> ${loan.monthsPaid || 0} / ${loan.term} ${loan.modality || 'quincenas'}</p>`;

    return `
      <div class="payment-history">
        <p><strong>Cliente:</strong> ${loan.customer?.firstName} ${loan.customer?.lastName}</p>
        <p><strong>Monto original:</strong> ${parseFloat(loan.amount || '0').toLocaleString('es-MX', {style: 'currency', currency: 'MXN'})}</p>
        <p><strong>Saldo actual:</strong> ${parseFloat(loan.currentBalance || '0').toLocaleString('es-MX', {style: 'currency', currency: 'MXN'})}</p>
        ${termInfo}
        <p><strong>Total pagado en intereses:</strong> ${parseFloat(loan.totalInterestPaid || '0').toLocaleString('es-MX', {style: 'currency', currency: 'MXN'})}</p>
        <p><strong>Total pagado al capital:</strong> ${parseFloat(loan.totalCapitalPaid || '0').toLocaleString('es-MX', {style: 'currency', currency: 'MXN'})}</p>
        <hr>
      </div>
    `;
  }
}