import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  dineroRestado: number;
  capitalRecuperado: number;
  interesRecabado: number;
  cargosExtrasRecaudados: number;
  capitalEnTransito: number;
  intersesMensual: number;
  prestamosVencidos: number;
  montoVencido: number;
  totalPrestamos: number;
  prestamosActivos: number;
  prestamosCompletados: number;
  totalRecaudadoCapsula: number;
  totalRecaudadoIndefinido: number;
  prestamosVencidosDetalle: any[];
  prestamosPorVencer: any[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }

  getLoansWithPaymentStatus(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/loans-status`);
  }
}
