import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // New import
import { ReportService } from '../../../core/services/report.service';
import Swal from 'sweetalert2'; // New import

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule // New import
  ],
  templateUrl: './reports-dashboard.component.html',
  styleUrls: ['./reports-dashboard.component.css']
})
export class ReportsDashboardComponent implements OnInit {
  loading = false; // New property

  constructor(private reportService: ReportService) {}

  ngOnInit(): void {
    // Cargar datos para reportes
  }

  exportLoans(): void {
    this.loading = true;
    this.reportService.exportLoans().subscribe({
      next: (blob: Blob) => {
        this.downloadFile(blob, 'prestamos.xlsx');
        this.loading = false;
        Swal.fire('Éxito', 'Reporte de préstamos exportado correctamente', 'success');
      },
      error: (error: any) => {
        console.error('Error al exportar préstamos:', error);
        this.loading = false;
        Swal.fire('Error', 'No se pudo exportar el reporte de préstamos', 'error');
      }
    });
  }

  exportPayments(): void {
    this.loading = true;
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    
    this.reportService.exportPayments(
      lastMonth.toISOString().split('T')[0],
      today.toISOString().split('T')[0],
      'past' // Added 'past' for clarity
    ).subscribe({
      next: (blob: Blob) => {
        this.downloadFile(blob, 'pagos.xlsx');
        this.loading = false;
        Swal.fire('Éxito', 'Reporte de pagos del último mes exportado correctamente', 'success');
      },
      error: (error: any) => {
        console.error('Error al exportar pagos:', error);
        this.loading = false;
        Swal.fire('Error', 'No se pudo exportar el reporte de pagos del último mes', 'error');
      }
    });
  }

  exportAllPayments(): void {
    this.loading = true;
    this.reportService.exportPayments(undefined, undefined, 'all').subscribe({
      next: (blob: Blob) => {
        this.downloadFile(blob, 'todos-los-pagos.xlsx');
        this.loading = false;
        Swal.fire('Éxito', 'Reporte de todos los pagos exportado correctamente', 'success');
      },
      error: (error: any) => {
        
        this.loading = false;
        Swal.fire('Error', 'No se pudo exportar el reporte de todos los pagos', 'error');
      }
    });
  }

  exportPaymentsByMonth(): void {
    const months = this.getMonthOptions();
    const currentYear = new Date().getFullYear();

    Swal.fire({
      title: 'Seleccionar Mes y Año',
      html: `
        <div class="date-range-picker">
          <div class="form-group">
            <label>Mes:</label>
            <select id="month" class="swal2-input" style="margin: 10px 0;">
              ${months}
            </select>
          </div>
          <div class="form-group">
            <label>Año:</label>
            <input type="number" id="year" class="swal2-input" style="margin: 10px 0;" value="${currentYear}">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Exportar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const month = (document.getElementById('month') as HTMLSelectElement).value;
        const year = (document.getElementById('year') as HTMLInputElement).value;
        
        if (!month || !year) {
          Swal.showValidationMessage('Por favor selecciona mes y año');
          return false;
        }
        
        return { month, year };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.loading = true;
        const month = parseInt(result.value.month, 10);
        const year = parseInt(result.value.year, 10);

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);

        const startDateString = startDate.toISOString().split('T')[0];
        const endDateString = endDate.toISOString().split('T')[0];

        this.reportService.exportPayments(startDateString, endDateString, 'past').subscribe({
          next: (blob: Blob) => {
            const monthName = this.getMonthName(month);
            const fileName = `pagos-${monthName}-${year}.xlsx`;
            this.downloadFile(blob, fileName);
            this.loading = false;
            Swal.fire('Éxito', `Reporte de ${monthName} ${year} exportado correctamente`, 'success');
          },
          error: (error: any) => {
            console.error('Error al exportar pagos por mes:', error);
            this.loading = false;
            Swal.fire('Error', 'No se pudo exportar el reporte por mes', 'error');
          }
        });
      }
    });
  }

  private getMonthName(monthIndex: number): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthIndex];
  }

  private getMonthOptions(): string {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const currentMonth = new Date().getMonth();
    return monthNames.map((name, index) => 
      `<option value="${index}" ${index === currentMonth ? 'selected' : ''}>${name}</option>`
    ).join('');
  }

  private downloadFile(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
