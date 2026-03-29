import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { MaterialAdminService } from '../../service/material-admin.service';
import { CsvImportResultResponse } from '../../model/material-variant.model';

@Component({
  selector: 'app-csv-import-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule
  ],
  templateUrl: './csv-import-dialog.component.html',
  styleUrl: './csv-import-dialog.component.css'
})
export class CsvImportDialogComponent {

  selectedFile: File | null = null;
  importing = false;
  importResult: CsvImportResultResponse | null = null;
  error: string | null = null;

  readonly acceptedTypes = '.csv';
  readonly maxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

  constructor(
    private readonly materialService: MaterialAdminService,
    private readonly dialogRef: MatDialogRef<CsvImportDialogComponent>
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setFile(input.files[0]);
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
      this.setFile(event.dataTransfer.files[0]);
    }
  }

  onImport(): void {
    if (!this.selectedFile) return;

    this.importing = true;
    this.error = null;

    this.materialService.importBoardVariantsCsv(this.selectedFile).subscribe({
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

  onDownloadTemplate(): void {
    this.materialService.downloadCsvTemplate().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'board_prices_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Template download error:', err)
    });
  }

  onClose(): void {
    this.dialogRef.close(this.hasImported);
  }

  removeFile(fileInput: HTMLInputElement): void {
    this.selectedFile = null;
    fileInput.value = '';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  get totalRows(): number {
    if (!this.importResult) return 0;
    return this.importResult.added + this.importResult.updated
      + (this.importResult.errors?.length || 0);
  }

  get successCount(): number {
    if (!this.importResult) return 0;
    return this.importResult.added + this.importResult.updated;
  }

  get hasErrors(): boolean {
    return !!this.importResult?.errors?.length;
  }

  get hasImported(): boolean {
    return this.importResult !== null && this.successCount > 0;
  }

  get successRate(): number {
    const total = this.totalRows;
    if (total === 0) return 0;
    return (this.successCount / total) * 100;
  }

  private setFile(file: File): void {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.error = 'Dozwolony format: CSV (średnik jako separator)';
      this.selectedFile = null;
      return;
    }
    if (file.size > this.maxFileSizeBytes) {
      this.error = `Plik jest zbyt duży (${this.formatFileSize(file.size)}). Maksymalny rozmiar: 10 MB`;
      this.selectedFile = null;
      return;
    }
    this.selectedFile = file;
    this.error = null;
    this.importResult = null;
  }
}
