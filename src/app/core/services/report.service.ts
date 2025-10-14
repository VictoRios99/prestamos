import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) { }

  exportLoans(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/loans/export`, {
      responseType: 'blob'
    });
  }

  exportPayments(startDate?: string, endDate?: string, reportType?: 'past' | 'all'): Observable<Blob> {
    let params = new HttpParams();
    if (startDate) {
      params = params.append('startDate', startDate);
    }
    if (endDate) {
      params = params.append('endDate', endDate);
    }
    if (reportType) {
      params = params.append('reportType', reportType);
    }

    return this.http.get(`${this.apiUrl}/payments/export`, {
      params,
      responseType: 'blob' // Important for handling binary data (Excel file)
    });
  }
}