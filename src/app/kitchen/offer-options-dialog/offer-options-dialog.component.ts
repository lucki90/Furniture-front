import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { OfferOptionsRequest } from '../service/project-pricing.service';

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

  constructor(
    public dialogRef: MatDialogRef<OfferOptionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) data: OfferOptionsRequest
  ) {
    // Restore previously saved values (passed from kitchen-page)
    this.showCostDetails      = data?.showCostDetails      ?? true;
    this.frontDescription     = data?.frontDescription     ?? '';
    this.countertopDescription = data?.countertopDescription ?? '';
    this.hardwareDescription  = data?.hardwareDescription  ?? 'Blum';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onGenerate(): void {
    const result: OfferOptionsRequest = {
      showCostDetails:       this.showCostDetails,
      frontDescription:      this.frontDescription.trim()       || undefined,
      countertopDescription: this.countertopDescription.trim()  || undefined,
      hardwareDescription:   this.hardwareDescription.trim()    || undefined
    };
    this.dialogRef.close(result);
  }
}
