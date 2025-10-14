import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoanService } from '../../../core/services/loan.service';
import { Loan } from '../../../core/models';
import Swal from 'sweetalert2';
import { MatCardModule } from '@angular/material/card';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-completed-loans-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './completed-loans-list.component.html',
  styleUrls: ['./completed-loans-list.component.css']
})
export class CompletedLoansListComponent implements OnInit {
  dataSource = new MatTableDataSource<Loan>();
  displayedColumns: string[] = ['id', 'customer', 'amount', 'loanDate', 'status', 'actions'];
  loading = false;

  constructor(private loanService: LoanService) { }

  ngOnInit(): void {
    this.loadCompletedLoans();
    this.dataSource.filterPredicate = (data: Loan, filter: string) => {
      const customerName = data.customer ? (data.customer.firstName + ' ' + data.customer.lastName).toLowerCase() : '';
      const status = data.status ? data.status.toLowerCase() : '';
      const dataStr = data.id + customerName + data.amount.toLowerCase() + status;
      return dataStr.includes(filter);
    };
  }

  loadCompletedLoans(): void {
    this.loading = true;
    this.loanService.getCompletedLoans().subscribe({
      next: (loans: Loan[]) => {
        this.dataSource.data = loans;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading completed loans:', error);
        this.loading = false;
        let errorMessage = 'No se pudieron cargar los préstamos completados';
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

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}
