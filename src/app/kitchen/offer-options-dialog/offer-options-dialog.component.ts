import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

/** Opcje z okna oferty: opcje dokumentu i decyzja, czy dołączyć widoki poglądowe (rysowane przed wysłaniem). */
export interface OfferDialogOptions {
  showCostDetails: boolean;
  frontDescription?: string;
  countertopDescription?: string;
  hardwareDescription?: string;
  includeViews: boolean;
}

@Component({
  selector: 'app-offer-options-dialog',
  templateUrl: './offer-options-dialog.component.html',
  styleUrls: ['./offer-options-dialog.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule]
})
export class OfferOptionsDialogComponent {

  showCostDetails: boolean;
  frontDescription: string;
  countertopDescription: string;
  hardwareDescription: string;
  includeViews: boolean;

  constructor(
    public dialogRef: MatDialogRef<OfferOptionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: Partial<OfferDialogOptions> | null
  ) {
    // Restore previously saved values (passed from kitchen-page)
    this.showCostDetails      = data?.showCostDetails      ?? true;
    this.frontDescription     = data?.frontDescription     ?? '';
    this.countertopDescription = data?.countertopDescription ?? '';
    this.hardwareDescription  = data?.hardwareDescription  ?? 'Blum';
    this.includeViews         = data?.includeViews         ?? true;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onGenerate(): void {
    const result: OfferDialogOptions = {
      showCostDetails:       this.showCostDetails,
      frontDescription:      this.frontDescription.trim()       || undefined,
      countertopDescription: this.countertopDescription.trim()  || undefined,
      hardwareDescription:   this.hardwareDescription.trim()    || undefined,
      includeViews:          this.includeViews
    };
    this.dialogRef.close(result);
  }
}
