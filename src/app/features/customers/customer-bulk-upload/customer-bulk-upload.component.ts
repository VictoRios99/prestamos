import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { CustomerService } from '../../../core/services/customer.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-customer-bulk-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatListModule
  ],
  templateUrl: './customer-bulk-upload.component.html',
  styleUrls: ['./customer-bulk-upload.component.css']
})
export class CustomerBulkUploadComponent {
  selectedFile: File | null = null;
  uploading = false;
  uploadResult: any = null;

  constructor(
    private dialogRef: MatDialogRef<CustomerBulkUploadComponent>,
    private customerService: CustomerService
  ) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validar que sea un archivo Excel
      if (file.name.match(/\.(xlsx|xls)$/)) {
        this.selectedFile = file;
        this.uploadResult = null;
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Archivo inválido',
          text: 'Por favor selecciona un archivo Excel (.xlsx o .xls)'
        });
        this.selectedFile = null;
        event.target.value = '';
      }
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin archivo',
        text: 'Por favor selecciona un archivo Excel primero'
      });
      return;
    }

    this.uploading = true;
    this.customerService.bulkUpload(this.selectedFile).subscribe({
      next: (result) => {
        this.uploading = false;
        this.uploadResult = result;

        if (result.failed === 0) {
          Swal.fire({
            icon: 'success',
            title: 'Carga exitosa',
            text: `Se cargaron ${result.success} clientes correctamente`
          }).then(() => {
            this.dialogRef.close(true);
          });
        } else {
          // Mostrar resumen si hay errores
          Swal.fire({
            icon: 'info',
            title: 'Carga completada con errores',
            html: `
              <p><strong>Exitosos:</strong> ${result.success}</p>
              <p><strong>Fallidos:</strong> ${result.failed}</p>
              <p>Revisa los detalles de los errores abajo.</p>
            `
          });
        }
      },
      error: (error) => {
        this.uploading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error?.message || 'Error al procesar el archivo'
        });
      }
    });
  }

  close(): void {
    this.dialogRef.close(this.uploadResult?.success > 0);
  }

  downloadTemplate(): void {
    // Crear datos de ejemplo para la plantilla
    const data = [
      {
        Nombre: 'JUAN CARLOS',
        Apellidos: 'PÉREZ GONZÁLEZ',
        Teléfono: '5551234567',
        Email: 'juan.perez@ejemplo.com',
        Dirección: 'CALLE PRINCIPAL #123'
      },
      {
        Nombre: 'maría luisa',
        Apellidos: 'GARCÍA RODRÍGUEZ',
        Teléfono: '5559876543',
        Email: 'MARIA.GARCIA@ejemplo.com',
        Dirección: 'av. central 456'
      },
      {
        Nombre: 'Pedro José',
        Apellidos: 'lópez martínez',
        Teléfono: '5551112233',
        Email: 'pedro@ejemplo.com',
        Dirección: 'Col. Centro Núm. 789'
      }
    ];

    // Crear una hoja de trabajo desde los datos
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Ajustar el ancho de las columnas
    const columnWidths = [
      { wch: 20 }, // Nombre
      { wch: 25 }, // Apellidos
      { wch: 15 }, // Teléfono
      { wch: 30 }, // Email
      { wch: 35 }  // Dirección
    ];
    worksheet['!cols'] = columnWidths;

    // Crear un libro de trabajo
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

    // Generar el archivo Excel
    XLSX.writeFile(workbook, 'plantilla_clientes.xlsx');
  }
}
