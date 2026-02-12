import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MaterialAdminService } from '../../service/material-admin.service';
import { BulkPriceUpdateRequest, BulkPriceUpdateResponse, PriceUpdate } from '../../model/material-variant.model';

@Component({
  selector: 'app-bulk-price-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './bulk-price-dialog.component.html',
  styleUrl: './bulk-price-dialog.component.css'
})
export class BulkPriceDialogComponent {
  form: FormGroup;
  saving = signal(false);
  result = signal<BulkPriceUpdateResponse | null>(null);

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<BulkPriceDialogComponent>,
    private materialAdminService: MaterialAdminService
  ) {
    this.form = this.fb.group({
      updates: this.fb.array([this.createUpdateRow()])
    });
  }

  get updates(): FormArray {
    return this.form.get('updates') as FormArray;
  }

  private createUpdateRow(): FormGroup {
    return this.fb.group({
      priceEntryId: [null, [Validators.required, Validators.min(1)]],
      newPrice: [null, [Validators.required, Validators.min(0)]]
    });
  }

  addRow(): void {
    this.updates.push(this.createUpdateRow());
  }

  removeRow(index: number): void {
    if (this.updates.length > 1) {
      this.updates.removeAt(index);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const formValue = this.form.value;

    const request: BulkPriceUpdateRequest = {
      updates: formValue.updates.map((u: any) => ({
        priceEntryId: u.priceEntryId,
        newPrice: u.newPrice
      } as PriceUpdate))
    };

    this.materialAdminService.bulkPriceUpdate(request).subscribe({
      next: (response) => {
        this.result.set(response);
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
      }
    });
  }

  onClose(): void {
    this.dialogRef.close(this.result() !== null);
  }

  resetForm(): void {
    this.result.set(null);
    this.form = this.fb.group({
      updates: this.fb.array([this.createUpdateRow()])
    });
  }
}
