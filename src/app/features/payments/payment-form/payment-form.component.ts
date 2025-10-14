import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { PaymentService } from '../../../core/services/payment.service';
import { LoanService } from '../../../core/services/loan.service';
import { Loan, Payment } from '../../../core/models';
import Swal from 'sweetalert2';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { startWith, map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { LoanProjection } from '../../../core/models/loan-projection.model';

// Custom Validator
function atLeastOne(control: AbstractControl): ValidationErrors | null {
  const selectedLoanType = (control.get('selectedLoan')?.value as Loan)?.loanType;

  if (selectedLoanType === 'Cápsula') {
    const amount = control.get('amount')?.value;
    return (amount !== null && amount > 0) ? null : { atLeastOne: true };
  } else { // Indefinido or other types
    const capitalAmount = control.get('capitalAmount')?.value;
    const interestAmount = control.get('interestAmount')?.value;
    return (capitalAmount !== null && capitalAmount > 0) || (interestAmount !== null && interestAmount > 0) ? null : { atLeastOne: true };
  }
}

function paymentDateAfterLoanDate(control: AbstractControl): ValidationErrors | null {
  const paymentDate = control.get('paymentDate')?.value;
  const selectedLoan = (control.parent as FormGroup)?.get('selectedLoan')?.value; // Access selectedLoan from parent form group

  if (!paymentDate || !selectedLoan || !selectedLoan.loanDate) {
    return null; // No validation if dates or loan are missing
  }

  const loanDate = new Date(selectedLoan.loanDate);
  const payDate = new Date(paymentDate);

  // Set hours, minutes, seconds, and milliseconds to 0 for accurate date comparison
  loanDate.setHours(0, 0, 0, 0);
  payDate.setHours(0, 0, 0, 0);

  return payDate < loanDate ? { paymentDateBeforeLoanDate: true } : null;
}

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatAutocompleteModule,
    CurrencyPipe,
    DatePipe
  ],
  templateUrl: './payment-form.component.html',
  styleUrls: ['./payment-form.component.css']
})
export class PaymentFormComponent implements OnInit {
  get isAmountReadonly(): boolean {
    if (!this.selectedLoan) {
      return true;
    }
    if (this.selectedLoan.loanType !== 'Cápsula') {
      return true;
    }
    if (this.selectedLoan.overduePeriodsCount && this.selectedLoan.overduePeriodsCount > 0) {
      const periodsToPay = this.paymentForm.get('overduePeriodsToPay')?.value;
      // If a specific number of overdue periods is selected (1 or more), make it readonly
      if (periodsToPay && periodsToPay > 0) {
        return true;
      }
      // If "pago regular" (0) is selected, or nothing is selected, allow editing
      return false;
    }
    return true;
  }

  paymentForm: FormGroup;
  loans: Loan[] = [];
  filteredLoans!: Observable<Loan[]>;
  selectedLoan: Loan | null = null;
  loading = false;
  paymentHistory: Payment[] = [];
  projection: LoanProjection | null = null;

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private loanService: LoanService
  ) {
    this.paymentForm = this.createPaymentForm();
  }

  ngOnInit(): void {
    this.loadActiveLoans();

    this.filteredLoans = this.paymentForm.get('loanSearchControl')!.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      map(value => this._filterLoans(value || ''))
    );

    this.paymentForm.get('overduePeriodsToPay')?.valueChanges.subscribe(periodsToPay => {
      if (this.selectedLoan && this.projection) {
        const amountControl = this.paymentForm.get('amount');
        if (periodsToPay !== null && periodsToPay > 0) {
          const amountToPay = Math.ceil(this.projection.estimatedPayment * periodsToPay);
          amountControl?.setValue(amountToPay);
        } else {
          // This covers periodsToPay === 0 or periodsToPay === null
          // For a regular payment or when the selection is cleared, default to the estimated payment for one period.
          amountControl?.setValue(Math.ceil(this.projection.estimatedPayment));
        }
      }
    });
  }

  private _filterLoans(value: string): Loan[] {
    const filterValue = value.toLowerCase();
    return this.loans.filter(loan => 
      (loan.id?.toString() || '').includes(filterValue) ||
      loan.customer?.firstName?.toLowerCase().includes(filterValue) ||
      loan.customer?.lastName?.toLowerCase().includes(filterValue) ||
      loan.amount.toLowerCase().includes(filterValue)
    );
  }

  private createPaymentForm(): FormGroup {
    return this.fb.group({
      loanId: [null, Validators.required],
      loanSearchControl: [''],
      paymentDate: [new Date(), Validators.required],
      amount: [{ value: null, disabled: true }, [Validators.min(0)]], // For Cápsula
      capitalAmount: [{ value: null, disabled: true }, [Validators.min(0)]], // For Indefinido
      interestAmount: [{ value: null, disabled: true }, [Validators.min(0)]], // For Indefinido
      lateInterest: [0, [Validators.min(0)]], // Interés por incumplimiento
      paymentMethod: ['CASH', Validators.required],
      notes: [''],
      selectedLoan: [null], // Hidden control to pass selectedLoan to validator
      overduePeriodsToPay: [null],
    }, { validators: [atLeastOne, paymentDateAfterLoanDate] });
  }

  getOverduePeriodOptions(): number[] {
    if (this.selectedLoan && this.selectedLoan.overduePeriodsCount) {
      const options = Array.from({ length: this.selectedLoan.overduePeriodsCount }, (_, i) => i + 1);
      return [0, ...options];
    }
    return [];
  }

  loadActiveLoans(): void {
    this.loading = true;
    this.loanService.getAll().subscribe({
      next: (loans: Loan[]) => {
        this.loans = loans.filter(loan =>
          (loan.status === 'ACTIVE' || loan.status === 'OVERDUE') && this.getParsedCurrentBalance(loan.currentBalance) > 0
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

  getParsedCurrentBalance(balance: string | undefined): number {
    return this.parseCurrencyToNumber(balance);
  }

  private parseCurrencyToNumber(currencyString: string | undefined): number {
    if (currencyString === undefined || currencyString === null) {
      return 0;
    }
    // Remove currency symbols, commas, and other non-numeric characters except for the decimal point
    const cleanedString = currencyString.replace(/[^0-9.-]+/g,"");
    return parseFloat(cleanedString);
  }

  get suggestedPayment(): number {
    if (!this.selectedLoan || !this.selectedLoan.monthlyInterestRate) {
      return 0;
    }
    const currentBalance = this.getParsedCurrentBalance(this.selectedLoan.currentBalance);
    const interestRate = parseFloat(this.selectedLoan.monthlyInterestRate) / 100;
    return currentBalance * interestRate;
  }

  get indefinidoCalculatedInterest(): number {
    if (this.selectedLoan && this.selectedLoan.loanType === 'Indefinido') {
      const currentBalance = this.parseCurrencyToNumber(this.selectedLoan.currentBalance);
      const monthlyInterestRate = parseFloat(this.selectedLoan.monthlyInterestRate || '0');
      return currentBalance * (monthlyInterestRate / 100);
    }
    return 0;
  }

  onLoanSelect(loanId: number): void {
    this.loanService.findOne(loanId).subscribe({
      next: (loanDetails) => {
        this.selectedLoan = loanDetails;
        if (this.selectedLoan) {
          this.paymentForm.get('selectedLoan')?.setValue(this.selectedLoan);
          this.paymentForm.get('loanId')?.setValue(this.selectedLoan.id);
          this.paymentForm.get('loanSearchControl')?.setValue(
            `#${this.selectedLoan.id} - ${this.selectedLoan.customer?.firstName} ${this.selectedLoan.customer?.lastName}`
          );
          const currentBalance = this.getParsedCurrentBalance(this.selectedLoan.currentBalance);

          // Conditional logic for input fields based on loanType
          if (this.selectedLoan.loanType === 'Cápsula') {
            this.paymentForm.get('amount')?.enable(); // Change from disable() to enable()
            this.paymentForm.get('amount')?.setValidators([Validators.required, Validators.min(0)]);
            this.paymentForm.get('capitalAmount')?.disable();
            this.paymentForm.get('capitalAmount')?.clearValidators();
            this.paymentForm.get('interestAmount')?.disable();
            this.paymentForm.get('interestAmount')?.clearValidators();

            this.projection = this.calculateProjection(this.selectedLoan);
            if (this.projection) {
              this.paymentForm.get('amount')?.setValue(Math.ceil(this.projection.estimatedPayment));
            }
          } else { // Indefinido
            this.paymentForm.get('amount')?.disable();
            this.paymentForm.get('amount')?.clearValidators();
            this.paymentForm.get('capitalAmount')?.enable();
            this.paymentForm.get('capitalAmount')?.setValidators([Validators.min(0), Validators.max(currentBalance)]);
            this.paymentForm.get('interestAmount')?.enable();
            this.paymentForm.get('interestAmount')?.setValidators([Validators.required, Validators.min(0)]);

            // Populate interestAmount for Indefinido loans
            this.paymentForm.get('interestAmount')?.setValue(Math.ceil(this.indefinidoCalculatedInterest));
            this.paymentForm.get('capitalAmount')?.setValue(null); // Clear capital amount for user input
          }

          this.paymentForm.get('amount')?.updateValueAndValidity();
          this.paymentForm.get('capitalAmount')?.updateValueAndValidity();
          this.paymentForm.get('interestAmount')?.updateValueAndValidity();
          this.paymentForm.updateValueAndValidity();
          this.loadPaymentHistory(loanId);
        }
      },
      error: (error) => {
        console.error('Error loading loan details:', error);
        this.selectedLoan = null;
        this.paymentForm.get('loanId')?.setValue(null);
        this.paymentForm.get('loanSearchControl')?.setValue('');
        this.paymentHistory = [];
        // Clear validators and disable fields when no loan is selected
        this.paymentForm.get('amount')?.clearValidators();
        this.paymentForm.get('amount')?.disable();
        this.paymentForm.get('capitalAmount')?.clearValidators();
        this.paymentForm.get('capitalAmount')?.disable();
        this.paymentForm.get('interestAmount')?.clearValidators();
        this.paymentForm.get('interestAmount')?.disable();

        this.paymentForm.get('amount')?.updateValueAndValidity();
        this.paymentForm.get('capitalAmount')?.updateValueAndValidity();
        this.paymentForm.get('interestAmount')?.updateValueAndValidity();
        this.projection = null;
      }
    });
  }

  loadPaymentHistory(loanId: number): void {
    this.paymentService.getPaymentHistory(loanId).subscribe({
      next: (response: any) => {
        this.paymentHistory = response.payments || [];
      },
      error: (error: any) => {
        console.error('Error loading payment history:', error);
      }
    });
  }

  calculateProjection(loan: Loan): LoanProjection {
    const amount = parseFloat(loan.amount);
    const monthlyInterestRate = parseFloat(loan.monthlyInterestRate || '0');
    const monthlyRate = monthlyInterestRate / 100;

    const projection: LoanProjection = {
      loanType: loan.loanType,
      amount: amount,
      monthlyInterestRate: monthlyInterestRate,
      paymentFrequency: '',
      estimatedPayment: 0,
      totalInterest: 0,
      totalPayments: 0,
      totalCapital: amount,
      terms: loan.term || 0,
      modality: loan.modality || 'meses',
      interestAmountForPeriod: 0
    };

    projection.interestAmountForPeriod = Math.ceil(amount * monthlyRate);

    if (loan.loanType === 'Indefinido') {
      projection.paymentFrequency = 'Mensual';
      projection.estimatedPayment = Math.ceil(amount * monthlyRate);
      projection.totalInterest = null;
      projection.totalPayments = null;
    } else { // Cápsula
      let numberOfPeriods = 0;
      let interestRateForPeriod = 0;

      if (loan.modality === 'quincenas') {
        projection.paymentFrequency = 'Quincenal';
        numberOfPeriods = loan.term || 0;
        interestRateForPeriod = monthlyRate / 2;
      } else { // meses
        projection.paymentFrequency = 'Mensual';
        numberOfPeriods = loan.term || 0;
        interestRateForPeriod = monthlyRate;
      }

      projection.interestAmountForPeriod = Math.ceil(amount * interestRateForPeriod);

      const totalInterest = Math.ceil(amount * interestRateForPeriod * numberOfPeriods);
      const totalAmountTheoretical = amount + totalInterest;

      // Calcular el pago por periodo redondeado hacia arriba
      projection.estimatedPayment = Math.ceil(totalAmountTheoretical / numberOfPeriods);

      // El total real a pagar es el pago por periodo × número de periodos
      projection.totalPayments = projection.estimatedPayment * numberOfPeriods;

      // Recalcular el interés total basado en el total real
      projection.totalInterest = projection.totalPayments - amount;
    }

    return projection;
  }

  onSubmit(): void {
    if (this.paymentForm.invalid || !this.selectedLoan) {
      this.markFormGroupTouched();
      return;
    }
    this.processPayment();
  }

  private processPayment(): void {
    this.loading = true;
    const formValue = this.paymentForm.value;
    
    let paymentData: any;

    if (this.selectedLoan?.loanType === 'Cápsula') {
      paymentData = {
        loanId: formValue.loanId,
        paymentDate: formValue.paymentDate.toISOString(),
        amount: parseFloat(formValue.amount || 0),
        paymentMethod: formValue.paymentMethod,
        notes: formValue.notes,
        overduePeriodsPaid: formValue.overduePeriodsToPay,
        lateInterest: parseFloat(formValue.lateInterest || 0),
      };
    } else { // Indefinido
      paymentData = {
        loanId: formValue.loanId,
        paymentDate: formValue.paymentDate.toISOString(),
        capitalAmount: parseFloat(formValue.capitalAmount || 0),
        interestAmount: parseFloat(formValue.interestAmount || 0),
        paymentMethod: formValue.paymentMethod,
        notes: formValue.notes,
        lateInterest: parseFloat(formValue.lateInterest || 0),
      };
    }

    this.paymentService.create(paymentData).subscribe({
      next: () => {
        this.loading = false;
        Swal.fire('Éxito', 'Pago registrado correctamente', 'success');
        this.resetForm();
        this.loadActiveLoans(); // This reloads all active loans

        // After reloading all loans, find the updated selectedLoan and refresh its data
        if (this.selectedLoan && this.selectedLoan.id !== undefined) {
          this.loanService.findOne(this.selectedLoan.id!).subscribe({ // Use non-null assertion
            next: (updatedLoan) => {
              // Update the loan in the 'loans' array first
              const index = this.loans.findIndex(l => l.id === updatedLoan.id);
              if (index !== -1) {
                this.loans[index] = updatedLoan;
              }

              // Then update selectedLoan and trigger change detection
              this.selectedLoan = { ...updatedLoan }; // Create a new object reference
              
              if (updatedLoan.id !== undefined) {
                this.loadPaymentHistory(updatedLoan.id!); // Use non-null assertion
              }
            },
            error: (error) => {
              console.error('Error refreshing selected loan:', error);
            }
          });
        }
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        console.error('Error al registrar el pago:', error);
        let errorMessage = 'No se pudo registrar el pago';
        if (error.error && error.error.message) {
          if (Array.isArray(error.error.message)) {
            errorMessage = error.error.message.join(', ');
          } else {
            errorMessage = error.error.message;
          }
        }
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  markFormGroupTouched(): void {
    Object.values(this.paymentForm.controls).forEach(control => {
      control.markAsTouched();
    });
    this.paymentForm.markAsTouched();
  }

  resetForm(): void {
    this.paymentForm.reset({
      paymentDate: new Date(),
      paymentMethod: 'CASH',
      amount: null,
      capitalAmount: null,
      interestAmount: null,
      lateInterest: 0
    });
    this.paymentForm.setErrors(null);
    Object.keys(this.paymentForm.controls).forEach(key => {
      this.paymentForm.get(key)?.setErrors(null);
      this.paymentForm.get(key)?.markAsUntouched();
    });

    // Re-enable/disable controls based on initial state (no loan selected)
    this.paymentForm.get('amount')?.disable();
    this.paymentForm.get('capitalAmount')?.disable();
    this.paymentForm.get('interestAmount')?.disable();

    this.selectedLoan = null;
    this.paymentHistory = [];
    this.projection = null;
  }

  getPaymentTotal(payment: any): number {
    const interest = parseFloat(payment.interestPaid) || 0;
    const capital = parseFloat(payment.capitalPaid) || 0;
    const extra = payment.lateInterest || 0;
    return interest + capital + extra;
  }

  getLoanTotalPaid(): number {
    if (!this.selectedLoan) {
      return 0;
    }
    const interest = parseFloat(String(this.selectedLoan.totalInterestPaid || 0));
    const capital = parseFloat(String(this.selectedLoan.totalCapitalPaid || 0));
    const extra = this.selectedLoan.totalExtraChargesPaid || 0;
    return interest + capital + extra;
  }

  onInputUppercase(event: Event, controlName: string): void {
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value.toUpperCase();
    this.paymentForm.get(controlName)?.setValue(value, { emitEvent: false });
  }
}