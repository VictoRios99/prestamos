import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoanService } from '../../../core/services/loan.service';
import { CustomerService } from '../../../core/services/customer.service';
import { Customer } from '../../../core/models';
import { LoanProjection } from '../../../core/models/loan-projection.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-loan-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './loan-form.component.html',
  styleUrls: ['./loan-form.component.css']
})
export class LoanFormComponent implements OnInit {
  loanForm: FormGroup;
  customers: Customer[] = [];
  loading = false;

  constructor(
    private fb: FormBuilder,
    private loanService: LoanService,
    private customerService: CustomerService,
    public dialogRef: MatDialogRef<LoanFormComponent>
  ) {
    this.loanForm = this.fb.group({
      customerId: ['', Validators.required],
      loanDate: [new Date(), Validators.required],
      amount: ['', [Validators.required, Validators.min(1)]],
      monthlyInterestRate: ['5', [Validators.required, Validators.min(0)]],
      loanType: ['', Validators.required], // New field
      modality: [{ value: '', disabled: true }], // New field, initially disabled
      terms: [{ value: null, disabled: true }], // New field, initially disabled
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadCustomers();
    this.setupLoanTypeChangeListener(); // New method call
  }

  private setupLoanTypeChangeListener(): void {
    this.loanForm.get('loanType')?.valueChanges.subscribe(loanType => {
      const modalityControl = this.loanForm.get('modality');
      const termsControl = this.loanForm.get('terms');

      if (loanType === 'Cápsula') {
        modalityControl?.enable();
        termsControl?.enable();
        modalityControl?.setValidators(Validators.required);
        termsControl?.setValidators(Validators.required);
      } else { // Indefinido
        modalityControl?.disable();
        termsControl?.disable();
        modalityControl?.clearValidators();
        termsControl?.clearValidators();
        modalityControl?.setValue('meses'); // Set to 'meses' for Indefinido loans
        termsControl?.setValue(null);
      }
      modalityControl?.updateValueAndValidity();
      termsControl?.updateValueAndValidity();
    });
  }

  loadCustomers(): void {
    this.customerService.getAll().subscribe({
      next: (customers) => {
        this.customers = customers;
      },
      error: (error) => {
        console.error('Error loading customers:', error);
        Swal.fire('Error', 'No se pudieron cargar los clientes', 'error');
      }
    });
  }

  onSubmit(): void {
    if (this.loanForm.invalid) {
      return;
    }

    const projection = this.calculateProjection();

    let projectionHtml = `
      <div style="text-align: left;">
        <h3>Resumen del Préstamo</h3>
        <p><strong>Monto del Préstamo:</strong> ${projection.amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</p>
        <p><strong>Tasa de Interés:</strong> ${projection.monthlyInterestRate}% ${projection.paymentFrequency} (${projection.interestAmountForPeriod.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })})</p>
    `;

    if (projection.loanType === 'Cápsula') {
      projectionHtml += `
        <p><strong>Plazo:</strong> ${projection.terms} ${projection.modality}</p>
        <p><strong>Pago Estimado por Periodo:</strong> ${projection.estimatedPayment.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</p>
        <p><strong>Interés Total Estimado:</strong> ${projection.totalInterest !== null ? projection.totalInterest.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : 'N/A'}</p>
        <p><strong>Total a Pagar:</strong> ${projection.totalPayments !== null ? projection.totalPayments.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : 'N/A'}</p>
      `;
    } else { // Indefinido
      projectionHtml += `
        <p><strong>Tipo de Préstamo:</strong> Indefinido</p>
        <p><strong>Pago Mínimo Sugerido:</strong> ${projection.estimatedPayment.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })} (solo intereses)</p>
        <p><strong>Nota:</strong> Para préstamos indefinidos, el capital se abona a discreción del cliente.</p>
      `;
    }

    projectionHtml += `</div>`;

    Swal.fire({
      title: 'Confirmar Préstamo',
      html: projectionHtml,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Confirmar y Guardar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      preConfirm: () => {
        this.loading = true; // Set loading true when user confirms
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const formData = this.loanForm.value;

        let termValue: number | null = null;
        let modalityValue: string | null = null;

        if (formData.loanType === 'Cápsula') {
          termValue = formData.terms;
          modalityValue = formData.modality;
        } else { // Indefinido
          modalityValue = 'meses';
        }

        const totalToPay = projection.totalPayments !== null ? Math.ceil(projection.totalPayments) : Math.ceil(parseFloat(formData.amount));

        const loanData = {
          ...formData,
          loanDate: this.formatDate(formData.loanDate),
          amount: Math.ceil(parseFloat(formData.amount)),
          monthlyInterestRate: formData.monthlyInterestRate.toString(),
          term: termValue,
          modality: modalityValue,
          totalToPay: totalToPay,
        };

        delete loanData.terms;

        console.log('Loan data being sent:', loanData);

        this.loanService.create(loanData).subscribe({
          next: (loan) => {
            Swal.fire('Éxito', `Préstamo creado correctamente`, 'success');
            this.dialogRef.close(true);
          },
          error: (error) => {
            this.loading = false;
            console.error('Error al crear préstamo:', error);
            console.error('Detalles del error:', error.error);

            let errorMessage = 'No se pudo crear el préstamo';

            if (Array.isArray(error.error?.message)) {
              errorMessage = error.error.message.join('<br>');
            } else if (typeof error.error?.message === 'string') {
              errorMessage = error.error.message;
            } else if (typeof error.error?.error === 'string') {
              errorMessage = error.error.error;
            } else if (error.status === 400) {
              errorMessage = 'Datos inválidos. Por favor verifica la información.';
            } else if (error.status === 500) {
              errorMessage = 'Error del servidor. Por favor intenta más tarde.';
            } else {
              errorMessage = 'Ocurrió un error inesperado.';
            }

            Swal.fire('Error', errorMessage, 'error');
          }
        });
      } else {
        this.loading = false; // Reset loading if user cancels
      }
    });
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onInputUppercase(event: Event, controlName: string): void {
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value.toUpperCase();
    this.loanForm.get(controlName)?.setValue(value, { emitEvent: false });
  }

  private calculateProjection(): LoanProjection {
    const formData = this.loanForm.value;
    const amount = parseFloat(formData.amount);
    const monthlyInterestRate = parseFloat(formData.monthlyInterestRate);
    const monthlyRate = monthlyInterestRate / 100;

    const projection: LoanProjection = {
      loanType: formData.loanType,
      amount: amount,
      monthlyInterestRate: monthlyInterestRate,
      paymentFrequency: '',
      estimatedPayment: 0,
      totalInterest: 0,
      totalPayments: 0,
      totalCapital: amount,
      terms: formData.terms,
      modality: formData.modality,
      interestAmountForPeriod: 0
    };

    if (formData.loanType === 'Indefinido') {
      projection.paymentFrequency = 'Mensual';
      projection.estimatedPayment = Math.ceil(amount * monthlyRate);
      projection.totalInterest = null;
      projection.totalPayments = null;
      projection.interestAmountForPeriod = Math.ceil(amount * monthlyRate);
    } else { // Cápsula
      let numberOfPeriods = 0;
      let interestRateForPeriod = 0;

      if (formData.modality === 'quincenas') {
        projection.paymentFrequency = 'Quincenal';
        numberOfPeriods = formData.terms;
        interestRateForPeriod = monthlyRate / 2;
      } else { // meses
        projection.paymentFrequency = 'Mensual';
        numberOfPeriods = formData.terms;
        interestRateForPeriod = monthlyRate;
      }

      projection.interestAmountForPeriod = Math.ceil(amount * interestRateForPeriod);

      // Calcular el interés total teórico (sin redondeo del pago por periodo)
      projection.totalInterest = Math.ceil(amount * interestRateForPeriod * numberOfPeriods);

      const totalAmountTheoretical = amount + projection.totalInterest;

      // Calcular el pago por periodo redondeado hacia arriba
      projection.estimatedPayment = Math.ceil(totalAmountTheoretical / numberOfPeriods);

      // El total real a pagar es el pago por periodo × número de periodos
      projection.totalPayments = projection.estimatedPayment * numberOfPeriods;
    }

    return projection;
  }
}