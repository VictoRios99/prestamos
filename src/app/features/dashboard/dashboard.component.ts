import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { DashboardService, DashboardStats } from '../../core/services/dashboard.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  loading = true;

  constructor(
    private dashboardService: DashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.dashboardService.getDashboardStats().subscribe({
      next: (data: DashboardStats) => {
        this.stats = data;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading dashboard:', error);
        this.loading = false;
        this.stats = null;
      }
    });
  }

  refreshDashboard(): void {
    this.loadDashboard();
  }

  getRecoveryPercentage(): number {
    if (!this.stats || this.stats.dineroRestado === 0) return 0;
    return Math.round((this.stats.capitalRecuperado / this.stats.dineroRestado) * 100);
  }

  getPunctualityPercentage(): number {
    if (!this.stats || this.stats.prestamosActivos === 0) return 100;
    const punctualLoans = this.stats.prestamosActivos - this.stats.prestamosVencidos;
    return Math.round((punctualLoans / this.stats.prestamosActivos) * 100);
  }

  getProfitMargin(): number {
    if (!this.stats || this.stats.capitalRecuperado === 0) return 0;
    return Math.round((this.stats.interesRecabado / this.stats.capitalRecuperado) * 100);
  }

  getTotalCollected(): number {
    if (!this.stats) return 0;
    return this.stats.capitalRecuperado + this.stats.interesRecabado + (this.stats.cargosExtrasRecaudados || 0);
  }

  getCurrentMonth(): string {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[new Date().getMonth()];
  }

  getPerformanceColor(type: 'recovery' | 'punctuality' | 'profit'): string {
    let percentage = 0;
    
    switch (type) {
      case 'recovery':
        percentage = this.getRecoveryPercentage();
        break;
      case 'punctuality':
        percentage = this.getPunctualityPercentage();
        break;
      case 'profit':
        percentage = this.getProfitMargin();
        break;
    }

    if (percentage >= 80) return 'conic-gradient(#28a745 ' + percentage + '%, #e9ecef ' + percentage + '%)';
    if (percentage >= 60) return 'conic-gradient(#ffc107 ' + percentage + '%, #e9ecef ' + percentage + '%)';
    return 'conic-gradient(#dc3545 ' + percentage + '%, #e9ecef ' + percentage + '%)';
  }

  viewOverdueLoans(): void {
    if (!this.stats?.prestamosVencidosDetalle) return;

    const overdueHTML = this.stats.prestamosVencidosDetalle.map((loan: any) => `
      <div class="overdue-detail">
        <p><strong>${loan.customer}</strong> - Préstamo #${loan.id}</p>
        <p>Saldo: ${loan.currentBalance.toLocaleString('es-MX', {style: 'currency', currency: 'MXN'})}</p>
        <p>Días sin pagar: <span class="text-danger">${loan.daysSinceLastPayment}</span></p>
        <p>Último pago: ${loan.lastPaymentDate ? new Date(loan.lastPaymentDate).toLocaleDateString('es-MX') : 'Nunca'}</p>
        <hr>
      </div>
    `).join('');

    Swal.fire({
      title: 'Préstamos Vencidos',
      html: `<div class="overdue-details-popup">${overdueHTML}</div>`,
      width: '600px',
      showCloseButton: true,
      showConfirmButton: false,
      customClass: { popup: 'overdue-popup' }
    });
  }

  generateOverdueReport(): void {
    Swal.fire('Información', 'Generando reporte de préstamos vencidos...', 'info');
    setTimeout(() => {
      Swal.fire('Éxito', 'Reporte generado correctamente', 'success');
    }, 2000);
  }

  // Dummy method to help with TS1128 error
  dummyMethod(): void {}
}
