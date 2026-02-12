import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';

import { PriceAdminService } from '../../service/price-admin.service';
import { PriceImportResultResponse } from '../../model/price-entry.model';

@Component({
  selector: 'app-price-import-dialog',
  templateUrl: './price-import-dialog.component.html',
  styleUrls: ['./price-import-dialog.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatListModule
  ]
})
export class PriceImportDialogComponent {

  selectedFile: File | null = null;
  importing = false;
  importResult: PriceImportResultResponse | null = null;
  error: string | null = null;

  acceptedTypes = '.csv,.xlsx,.xls';

  constructor(
    private readonly priceService: PriceAdminService,
    private readonly dialogRef: MatDialogRef<PriceImportDialogComponent>
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Walidacja typu pliku
      const validExtensions = ['.csv', '.xlsx', '.xls'];
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

      if (!validExtensions.includes(extension)) {
        this.error = 'Nieobsługiwany format pliku. Dozwolone: CSV, XLSX, XLS';
        this.selectedFile = null;
        return;
      }

      this.selectedFile = file;
      this.error = null;
      this.importResult = null;
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      const validExtensions = ['.csv', '.xlsx', '.xls'];
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

      if (!validExtensions.includes(extension)) {
        this.error = 'Nieobsługiwany format pliku. Dozwolone: CSV, XLSX, XLS';
        this.selectedFile = null;
        return;
      }

      this.selectedFile = file;
      this.error = null;
      this.importResult = null;
    }
  }

  onImport(): void {
    if (!this.selectedFile) return;

    this.importing = true;
    this.error = null;

    this.priceService.importPrices(this.selectedFile).subscribe({
      next: (result) => {
        this.importing = false;
        this.importResult = result;
      },
      error: (err) => {
        this.importing = false;
        this.error = err.error?.message || 'Błąd podczas importu pliku';
        console.error('Import error:', err);
      }
    });
  }

  onClose(): void {
    this.dialogRef.close(this.importResult !== null && this.importResult.successfulImports > 0);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  get hasErrors(): boolean {
    return this.importResult !== null &&
           this.importResult.errors !== null &&
           this.importResult.errors.length > 0;
  }

  get successRate(): number {
    if (!this.importResult || this.importResult.totalRows === 0) return 0;
    return (this.importResult.successfulImports / this.importResult.totalRows) * 100;
  }
}
