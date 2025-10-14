export interface LoanProjection {
  loanType: 'Cápsula' | 'Indefinido';
  amount: number;
  monthlyInterestRate: number;
  paymentFrequency: string;
  estimatedPayment: number;
  totalInterest: number | null;
  totalPayments: number | null;
  totalCapital: number;
  terms: number;
  modality: 'meses' | 'quincenas';
  interestAmountForPeriod: number;
}