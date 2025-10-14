import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'; // Import map operator
import { environment } from '../../../environments/environment';
import { Loan } from '../models';

@Injectable({
  providedIn: 'root'
})
export class LoanService {
  private apiUrl = `${environment.apiUrl}/loans`;

  constructor(private http: HttpClient) {}

  private parseLoanData(loan: any): Loan {
    const parsedLoan: Loan = { ...loan };

    // Explicitly parse id as a number
    parsedLoan.id = parseFloat(loan.id); // Add this line

    // Safely parse numeric fields
    parsedLoan.amount = this.parseCurrencyToNumber(loan.amount).toString(); // Keep as string for consistency with Loan interface
    parsedLoan.currentBalance = this.parseCurrencyToNumber(loan.currentBalance).toString();
    parsedLoan.monthlyInterestRate = this.parseCurrencyToNumber(loan.monthlyInterestRate).toString();
    parsedLoan.totalInterestPaid = this.parseCurrencyToNumber(loan.totalInterestPaid).toString();
    parsedLoan.totalCapitalPaid = this.parseCurrencyToNumber(loan.totalCapitalPaid).toString();
    parsedLoan.term = loan.term ? parseFloat(loan.term) : undefined; // Parse term as number, keep undefined if not present
    parsedLoan.monthsPaid = loan.monthsPaid ? parseFloat(loan.monthsPaid) : undefined;

    // Derive loanType based on term
    parsedLoan.loanType = parsedLoan.term ? 'Cápsula' : 'Indefinido';

    // Ensure modality has a default if missing for Cápsula loans
    if (parsedLoan.loanType === 'Cápsula' && !parsedLoan.modality) {
      parsedLoan.modality = 'meses'; // Default to 'meses' for Cápsula if not specified
    } else if (parsedLoan.loanType === 'Indefinido') {
      parsedLoan.modality = 'meses'; // Indefinido loans typically have monthly interest
    }

    return parsedLoan;
  }

  private parseCurrencyToNumber(value: any): number {
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.-]+/g, '');
      return parseFloat(cleaned) || 0;
    }
    return parseFloat(value) || 0;
  }

  getAll(): Observable<Loan[]> {
    return this.http.get<Loan[]>(this.apiUrl).pipe(
      map(loans => loans.map(loan => this.parseLoanData(loan)))
    );
  }

  findOne(id: number): Observable<Loan> {
    return this.http.get<Loan>(`${this.apiUrl}/${id}`).pipe(
      map(loan => this.parseLoanData(loan))
    );
  }

  // Alias para findOne (usado en loan-details)
  getById(id: number): Observable<Loan> {
    return this.findOne(id);
  }

  create(loanData: any): Observable<Loan> {
    return this.http.post<Loan>(this.apiUrl, loanData);
  }

  update(id: number, loanData: any): Observable<Loan> {
    return this.http.put<Loan>(`${this.apiUrl}/${id}`, loanData);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getBalance(loanId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${loanId}/balance`);
  }

  findByCustomer(customerId: number): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.apiUrl}/customer/${customerId}`);
  }

  getOverdueLoans(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.apiUrl}/overdue`);
  }

  getCompletedLoans(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.apiUrl}/completed`).pipe(
      map(loans => loans.map(loan => this.parseLoanData(loan)))
    );
  }
}