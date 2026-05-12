import {
  Component,
  ContentChild,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
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

export interface BulkSaveEvent {
  /** IDs of selected rows to update. */
  ids: number[];
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
 *      (bulkSave)="onBulkSave($event)"
 *      (retry)="load()">
 *
 *    <!-- Optional filter toolbar above the table -->
 *    <ng-template #toolbar>...</ng-template>
 *
 *    <!-- <th> elements (checkbox + price + actions columns added automatically) -->
 *    <ng-template #headers>
 *      <th>Kategoria</th><th>Model</th>...
 *    </ng-template>
 *
 *    <!-- <td> elements per row (checkbox + price + actions columns added automatically) -->
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
export class PriceEditTableComponent implements OnChanges {

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

  /**
   * Initial number of rows per page (default: 10).
   * The user can change this via the page-size selector in the pagination footer.
   */
  @Input() pageSize = 10;

  /** Optional toolbar template rendered above the table (filters etc.). */
  @ContentChild('toolbar') toolbarTemplate?: TemplateRef<any>;

  /** Column headers template (<th> elements). */
  @ContentChild('headers') headersTemplate!: TemplateRef<any>;

  /** Row cells template (<td> elements), receives row as implicit context. */
  @ContentChild('rowCells') rowCellsTemplate!: TemplateRef<any>;

  /** Emitted when user clicks "Zapisz". Parent must call event.complete(true/false). */
  @Output() save = new EventEmitter<PriceSaveEvent>();

  /**
   * Emitted when user confirms bulk price set for selected rows.
   * ids = IDs of currently selected rows.
   * Parent must call event.complete(true/false).
   */
  @Output() bulkSave = new EventEmitter<BulkSaveEvent>();

  /** Emitted when user clicks "Spróbuj ponownie" in the error state. */
  @Output() retry = new EventEmitter<void>();

  // ── Page size ─────────────────────────────────────────────────────────────

  /** Available page-size choices shown in the selector. */
  readonly pageSizeOptions = [10, 25, 50, 100];

  /** Currently active page size (user-selectable). Initialised from `pageSize` input. */
  internalPageSize = 10;

  setPageSize(size: number): void {
    this.internalPageSize = size;
    this.currentPage = 1;
    this.clearSelection();
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  currentPage = 1;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.rows.length / this.internalPageSize));
  }

  get paginatedRows(): any[] {
    const start = (this.currentPage - 1) * this.internalPageSize;
    return this.rows.slice(start, start + this.internalPageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get currentPageEnd(): number {
    return Math.min(this.currentPage * this.internalPageSize, this.rows.length);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pageSize']) {
      // Sync internal page size whenever the @Input changes (e.g. host sets a custom default)
      this.internalPageSize = this.pageSize;
    }
    if (changes['rows']) {
      const previousRows = (changes['rows'].previousValue as any[] | undefined) ?? [];
      const currentRows = (changes['rows'].currentValue as any[] | undefined) ?? [];
      const rowIdsChanged = this.haveRowIdsChanged(previousRows, currentRows);

      if (rowIdsChanged) {
        // A different row set usually means filtering/reload, so we intentionally reset pagination
        // and transient UI state to avoid keeping selection/edit state for rows that disappeared.
        this.currentPage = 1;
        this.editingId = null;
        this.clearSelection();
      } else if (this.currentPage > this.totalPages) {
        this.currentPage = this.totalPages;
      }
    }
  }

  // ── Checkbox selection ────────────────────────────────────────────────────

  selectedIds = new Set<number>();

  get selectedCount(): number {
    return this.selectedIds.size;
  }

  get allCurrentPageSelected(): boolean {
    return this.paginatedRows.length > 0 &&
           this.paginatedRows.every(r => this.selectedIds.has(r.id));
  }

  toggleAllCurrentPage(): void {
    if (this.allCurrentPageSelected) {
      this.paginatedRows.forEach(r => this.selectedIds.delete(r.id));
    } else {
      this.paginatedRows.forEach(r => this.selectedIds.add(r.id));
    }
  }

  toggleSelection(id: number): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  clearSelection(): void {
    this.selectedIds = new Set<number>();
  }

  // ── Bulk set price for selected ───────────────────────────────────────────

  bulkPrice = 0;
  bulkSaving = false;

  submitBulkForSelected(): void {
    if (this.selectedIds.size === 0) return;
    this.bulkSaving = true;
    this.bulkSave.emit({
      ids: Array.from(this.selectedIds),
      price: this.bulkPrice,
      complete: (success: boolean) => {
        this.bulkSaving = false;
        if (success) {
          this.clearSelection();
          this.bulkPrice = 0;
        }
      },
    });
  }

  // ── Internal edit state ───────────────────────────────────────────────────

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

  private haveRowIdsChanged(previousRows: any[], currentRows: any[]): boolean {
    if (previousRows.length !== currentRows.length) {
      return true;
    }
    for (let i = 0; i < currentRows.length; i++) {
      if (previousRows[i]?.id !== currentRows[i]?.id) {
        return true;
      }
    }
    return false;
  }

  protected trackById = (_: number, row: any) => row.id;
}
