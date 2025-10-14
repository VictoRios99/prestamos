import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { LoanService } from '../../../core/services/loan.service';
import { ActivatedRoute, RouterModule } from '@angular/router'; // Import RouterModule
import { Loan } from '../../../core/models';

@Component({
  selector: 'app-loan-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatChipsModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    RouterModule // Add RouterModule here
  ],
  templateUrl: './loan-details.component.html',
  styleUrls: ['./loan-details.component.css']
})
export class LoanDetailsComponent implements OnInit {
  loan: any;
  displayedColumns: string[] = ['month', 'dueDate', 'expectedAmount', 'paidAmount', 'interestPaid', 'capitalPaid', 'paymentDate', 'status'];

  constructor(
    private route: ActivatedRoute,
    private loanService: LoanService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.loadLoanDetails();
  }

  loadLoanDetails(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loanService.getById(+id).subscribe({
        next: (loan) => {
          this.loan = loan;
          console.log('Loan details:', this.loan);
        },
        error: (error) => {
          console.error('Error loading loan details:', error);
        }
      });
    }
  }

  goBack(): void {
    this.location.back();
  }

  getEstimatedPayment(): number {
    if (!this.loan) {
      return 0;
    }

    const amount = parseFloat(this.loan.amount);
    const monthlyInterestRate = parseFloat(this.loan.monthlyInterestRate);
    const monthlyRate = monthlyInterestRate / 100;
    const terms = this.loan.term || 0;

    if (this.loan.loanType === 'Indefinido') {
      // Pago sugerido = porcentaje del interes * el monto original
      return Math.ceil(amount * monthlyRate);
    } else if (this.loan.loanType === 'Cápsula') {
      let interestRateForPeriod: number;
      let numPayments: number;

      if (this.loan.modality === 'quincenas') {
        interestRateForPeriod = monthlyRate / 2;
        numPayments = terms;
      } else { // Mensual
        interestRateForPeriod = monthlyRate;
        numPayments = terms;
      }

      // Calcular el total teórico de intereses y total a pagar
      const totalInterest = Math.ceil(amount * interestRateForPeriod * numPayments);
      const totalAmountTheoretical = amount + totalInterest;

      // Calcular el pago por periodo redondeado hacia arriba
      return Math.ceil(totalAmountTheoretical / numPayments);
    }
    return 0;
  }

  getTotalPaid(): number {
    if (!this.loan) {
      return 0;
    }

    const totalInterest = parseFloat(String(this.loan.totalInterestPaid || 0));
    const totalCapital = parseFloat(String(this.loan.totalCapitalPaid || 0));
    const totalExtra = this.loan.totalExtraChargesPaid || 0;

    return totalInterest + totalCapital + totalExtra;
  }


}
