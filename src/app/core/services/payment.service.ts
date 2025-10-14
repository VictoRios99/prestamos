import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  create(paymentData: any): Observable<any> {
    return this.http.post(this.apiUrl, paymentData);
  }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  findOne(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  getPaymentHistory(loanId: number): Observable<{
    payments: any[];
    summary: {
      totalPaid: number;
      totalInterest: number;
      totalCapital: number;
      monthsPaid: number;
      remainingBalance: number;
      monthlyPayment: number;
    }
  }> {
    return this.http.get<any>(`${this.apiUrl}/history/${loanId}`);
  }

  findByLoan(loanId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/loan/${loanId}`);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  
}
