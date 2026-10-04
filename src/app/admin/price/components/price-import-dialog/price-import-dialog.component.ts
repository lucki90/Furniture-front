import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
    MatListModule
  ]
})
export class PriceImportDialogComponent {
  selectedFile: File | null = null;
  importing = false;
  importResult: PriceImportResultResponse | null = null;
  error: string | null = null;

  private closeLocked = false;
  private confirmedImport = false;
  private previousDisableClose: boolean | undefined;

  acceptedTypes = '.csv';

  constructor(
    private readonly priceService: PriceAdminService,
    private readonly dialogRef: MatDialogRef<PriceImportDialogComponent>
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectFile(input.files[0]);
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
      this.selectFile(event.dataTransfer.files[0]);
    }
  }

  private selectFile(file: File): void {
    if (!this.isCsvFile(file)) {
      this.error = 'Nieobsługiwany format pliku. Dozwolony: CSV';
      this.selectedFile = null;
      return;
    }

    this.selectedFile = file;
    this.error = null;
    this.importResult = null;
  }

  private isCsvFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.csv');
  }

  onImport(): void {
    if (!this.selectedFile || this.importing) return;

    this.beginImport();
    this.error = null;

    this.priceService.importPrices(this.selectedFile).subscribe({
      next: (result) => {
        this.endImport();
        this.importResult = result;
        this.confirmedImport = this.confirmedImport || result.added + result.updated > 0;
      },
      error: (err) => {
        this.endImport();
        this.error = err.error?.message || 'Błąd podczas importu pliku';
        console.error('Import error:', err);
      }
    });
  }

  // Zamknięcie dialogu w trakcie POST odcięłoby rodzica od wyniku zapisu, więc na czas importu
  // blokujemy Escape/tło, a po odpowiedzi przywracamy konfigurację ustawioną przez wywołującego.
  private beginImport(): void {
    this.importing = true;
    if (!this.closeLocked) {
      this.closeLocked = true;
      this.previousDisableClose = this.dialogRef.disableClose;
      this.dialogRef.disableClose = true;
    }
  }

  private endImport(): void {
    this.importing = false;
    if (this.closeLocked) {
      this.closeLocked = false;
      this.dialogRef.disableClose = this.previousDisableClose;
    }
  }

  onClose(): void {
    if (this.importing) return;
    this.dialogRef.close(this.importConfirmed);
  }

  clearSelectedFile(fileInput: HTMLInputElement): void {
    this.selectedFile = null;
    fileInput.value = '';
    this.error = null;
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

  // Potwierdzony zapis (added+updated>0) zostaje także po wyczyszczeniu wyświetlanego wyniku i kolejnym
  // niepowodzeniu; rodzic odczytuje go po zamknięciu dialogu Escape/tłem, gdy afterClosed emituje undefined.
  get importConfirmed(): boolean {
    return this.confirmedImport;
  }

  get savedCount(): number {
    return this.importResult ? this.importResult.added + this.importResult.updated : 0;
  }

  protected trackByIndex = (index: number) => index;
}
