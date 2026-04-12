import {
  Component,
  ContentChild,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
} from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PriceSaveEvent {
  id: number;
  price: number;
  /** Call complete(true) on success, complete(false) on error. */
  complete: (success: boolean) => void;
}

/**
 * Reusable price-editing table for settings panels (components, jobs, etc.).
 *
 * Usage:
 *  <app-price-edit-table
 *      [rows]="myItems"
 *      priceField="pricePerUnit"
 *      priceLabel="Cena / jedn."
 *      [loading]="loading"
 *      [error]="error"
 *      [rowClassFn]="getRowClass"
 *      (save)="onSave($event)"
 *      (retry)="load()">
 *
 *    <!-- Optional filter toolbar above the table -->
 *    <ng-template #toolbar>...</ng-template>
 *
 *    <!-- <th> elements (price + actions columns added automatically) -->
 *    <ng-template #headers>
 *      <th>Kategoria</th><th>Model</th>...
 *    </ng-template>
 *
 *    <!-- <td> elements per row (price + actions columns added automatically) -->
 *    <ng-template #rowCells let-row>
 *      <td>{{ row.category }}</td><td>{{ row.modelCode }}</td>...
 *    </ng-template>
 *  </app-price-edit-table>
 */
@Component({
  selector: 'app-price-edit-table',
  templateUrl: './price-edit-table.component.html',
  styleUrls: ['./price-edit-table.component.css'],
  standalone: true,
  imports: [CommonModule, NgTemplateOutlet, FormsModule],
})
export class PriceEditTableComponent {

  /** Data rows — each must have an `id: number` field. */
  @Input() rows: any[] = [];

  /** Name of the price field on each row (e.g. "pricePerUnit", "pricePerM2"). */
  @Input() priceField = 'pricePerUnit';

  /** Label for the price column header. */
  @Input() priceLabel = 'Cena';

  /** Unit suffix shown after the price value (e.g. "zł", "zł/m²"). */
  @Input() priceUnit = 'zł';

  /** Shows a loading indicator instead of the table. */
  @Input() loading = false;

  /** Shows an error banner instead of the table. */
  @Input() error: string | null = null;

  /** Text shown when rows is empty. */
  @Input() emptyText = 'Brak danych.';

  /**
   * Optional function to compute extra CSS class(es) for a row.
   * Return 'inactive' to apply built-in opacity styling.
   */
  @Input() rowClassFn: ((row: any) => string) | null = null;

  /** Optional toolbar template rendered above the table (filters etc.). */
  @ContentChild('toolbar') toolbarTemplate?: TemplateRef<any>;

  /** Column headers template (<th> elements). */
  @ContentChild('headers') headersTemplate!: TemplateRef<any>;

  /** Row cells template (<td> elements), receives row as implicit context. */
  @ContentChild('rowCells') rowCellsTemplate!: TemplateRef<any>;

  /** Emitted when user clicks "Zapisz". Parent must call event.complete(true/false). */
  @Output() save = new EventEmitter<PriceSaveEvent>();

  /** Emitted when user clicks "Spróbuj ponownie" in the error state. */
  @Output() retry = new EventEmitter<void>();

  // ── internal edit state ──────────────────────────────────────────────────

  editingId: number | null = null;
  editPrice = 0;
  saving = false;

  startEdit(row: any): void {
    this.editingId = row.id;
    this.editPrice = row[this.priceField] ?? 0;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.saving = false;
  }

  submitEdit(row: any): void {
    this.saving = true;
    this.save.emit({
      id: row.id,
      price: this.editPrice,
      complete: (success: boolean) => {
        this.saving = false;
        if (success) {
          this.editingId = null;
        }
      },
    });
  }

  isEditing(row: any): boolean {
    return this.editingId === row.id;
  }

  getRowClass(row: any): string {
    return this.rowClassFn ? this.rowClassFn(row) : '';
  }

  formatPrice(row: any): string {
    const price = row[this.priceField];
    if (price == null) return '—';
    return `${Number(price).toFixed(2)} ${this.priceUnit}`;
  }

  protected trackById = (_: number, row: any) => row.id;
}
