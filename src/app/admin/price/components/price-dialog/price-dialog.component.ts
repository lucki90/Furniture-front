import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PriceAdminService } from '../../service/price-admin.service';
import {
  PriceEntryAdminResponse,
  PriceEntryCreateRequest,
  PriceEntryUpdateRequest
} from '../../model/price-entry.model';

export interface PriceDialogData {
  mode: 'create' | 'edit';
  price?: PriceEntryAdminResponse;
}

@Component({
  selector: 'app-price-dialog',
  templateUrl: './price-dialog.component.html',
  styleUrls: ['./price-dialog.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ]
})
export class PriceDialogComponent implements OnInit {

  form!: FormGroup;
  saving = false;
  isEditMode: boolean;

  units = ['m2', 'm', 'piece', 'kg', 'l', 'set'];
  currencies = ['PLN', 'EUR', 'USD'];

  constructor(
    private readonly fb: FormBuilder,
    private readonly priceService: PriceAdminService,
    private readonly dialogRef: MatDialogRef<PriceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PriceDialogData
  ) {
    this.isEditMode = data.mode === 'edit';
  }

  ngOnInit(): void {
    this.initForm();
    if (this.isEditMode && this.data.price) {
      this.populateForm(this.data.price);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.maxLength(255)]],
      description: [''],
      unit: ['', [Validators.required, Validators.maxLength(50)]],
      currency: ['PLN', [Validators.maxLength(10)]],
      currentPrice: [null, [Validators.required, Validators.min(0)]],
      sourceUrl: [''],
      urlSelector: [''],
      isActive: [true]
    });
  }

  private populateForm(price: PriceEntryAdminResponse): void {
    this.form.patchValue({
      name: price.name || '',
      description: price.description || '',
      unit: price.unit,
      currency: price.currency,
      currentPrice: price.currentPrice,
      sourceUrl: price.sourceUrl || '',
      urlSelector: price.urlSelector || '',
      isActive: price.isActive
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;

    if (this.isEditMode) {
      this.updatePrice();
    } else {
      this.createPrice();
    }
  }

  private createPrice(): void {
    const request: PriceEntryCreateRequest = {
      name: this.form.value.name || undefined,
      description: this.form.value.description || undefined,
      unit: this.form.value.unit,
      currency: this.form.value.currency,
      currentPrice: this.form.value.currentPrice,
      sourceUrl: this.form.value.sourceUrl || undefined,
      urlSelector: this.form.value.urlSelector || undefined
    };

    this.priceService.create(request).subscribe({
      next: () => {
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        console.error('Error creating price:', err);
        alert('Błąd podczas tworzenia ceny');
      }
    });
  }

  private updatePrice(): void {
    if (!this.data.price) return;

    const request: PriceEntryUpdateRequest = {
      name: this.form.value.name || undefined,
      description: this.form.value.description || undefined,
      unit: this.form.value.unit,
      currency: this.form.value.currency,
      currentPrice: this.form.value.currentPrice,
      sourceUrl: this.form.value.sourceUrl || undefined,
      urlSelector: this.form.value.urlSelector || undefined,
      isActive: this.form.value.isActive
    };

    this.priceService.update(this.data.price.id, request).subscribe({
      next: () => {
        this.saving = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        console.error('Error updating price:', err);
        alert('Błąd podczas aktualizacji ceny');
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  get title(): string {
    return this.isEditMode ? 'Edytuj cenę' : 'Dodaj nową cenę';
  }
}
