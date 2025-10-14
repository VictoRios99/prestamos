import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CustomerService } from '../../../core/services/customer.service';
import { Customer } from '../../../core/models';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './customer-form.component.html',
  styleUrls: ['./customer-form.component.css']
})
export class CustomerFormComponent {
  customerForm: FormGroup;
  isEdit: boolean;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private customerService: CustomerService,
    public dialogRef: MatDialogRef<CustomerFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Customer
  ) {
    this.isEdit = !!data;
    this.customerForm = this.fb.group({
      firstName: [data?.firstName || '', Validators.required],
      lastName: [data?.lastName || '', Validators.required],
      phone: [data?.phone || ''],
      email: [data?.email || '', Validators.email],
      address: [data?.address || '']
    });
  }

  onSubmit(): void {
    if (this.customerForm.invalid) {
      return;
    }

    this.loading = true;
    const customerData = this.customerForm.value;

    const request = this.isEdit && this.data.id
      ? this.customerService.update(this.data.id, customerData)
      : this.customerService.create(customerData);

    request.subscribe({
      next: (customer) => {
        Swal.fire('Éxito', `Cliente ${this.isEdit ? 'actualizado' : 'creado'} correctamente`, 'success');
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.loading = false;
        Swal.fire('Error', 'No se pudo guardar el cliente', 'error');
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onInputUppercase(event: Event, controlName: string): void {
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value.toUpperCase();
    this.customerForm.get(controlName)?.setValue(value, { emitEvent: false });
  }
}
