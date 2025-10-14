import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { LoginComponent } from './features/auth/login/login.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { CustomerListComponent } from './features/customers/customer-list/customer-list.component';
import { LoanListComponent } from './features/loans/loan-list/loan-list.component';
import { PaymentFormComponent } from './features/payments/payment-form/payment-form.component';
import { ReportsDashboardComponent } from './features/reports/reports-dashboard/reports-dashboard.component';
import { CompletedLoansListComponent } from './features/loans/completed-loans-list/completed-loans-list.component';
import { LoanDetailsComponent } from './features/loans/loan-details/loan-details.component';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        component: LoginComponent
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'customers',
        component: CustomerListComponent
      },
      {
        path: 'loans',
        component: LoanListComponent
      },
      {
        path: 'loans/:id',
        component: LoanDetailsComponent
      },
      {
        path: 'payments',
        component: PaymentFormComponent
      },
      {
        path: 'completed-loans',
        component: CompletedLoansListComponent
      },
      {
        path: 'reports',
        component: ReportsDashboardComponent
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
