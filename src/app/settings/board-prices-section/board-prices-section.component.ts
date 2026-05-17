import { Component, Input, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { FormFieldComponent } from '../../shared/form-field/form-field.component';
import { BoardPriceService, BoardPrice, CreateBoardPrice } from '../board-price.service';
import { MaterialOption } from '../../admin/material/model/material-variant.model';

/**
 * Sekcja "Cennik płyt" wydzielona z SettingsComponent (R.2.3).
 *
 * Odpowiedzialności:
 * - Ładowanie, dodawanie i edytowanie cen płyt (BoardPriceService)
 * - Usuwanie (dezaktywacja) płyt — pojedynczo lub dla zaznaczonych
 *   - Własne płyty (OWN): usuwa bezpośrednio
 *   - Systemowe płyty (GLOBAL): backend tworzy shadow record (clone-on-write)
 * - Edycja cen płyt systemowych: backend tworzy OWN override (zmiana w kontekście użytkownika)
 * - Ustalanie ceny dla zaznaczonych płyt
 * - Import CSV + pobieranie szablonu
 * - Paginacja wyników (domyślnie 10 na stronę, wybór 10/25/50/100)
 * - Emitowanie boardPricesChanged po każdej zmianie (parent przebudowuje listy kolorów)
 */
@Component({
  selector: 'app-board-prices-section',
  templateUrl: './board-prices-section.component.html',
  styleUrls: ['./board-prices-section.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, FormFieldComponent],
})
export class BoardPricesSectionComponent implements OnInit {

  @Input() translations: Record<string, string> = {};
  @Input() materialOptions: MaterialOption[] = [];
  @Input() saving = false;

  /** Emitowane po każdej zmianie listy płyt — parent przebudowuje listy kolorów materiałów. */
  @Output() boardPricesChanged = new EventEmitter<BoardPrice[]>();

  private boardPriceService = inject(BoardPriceService);

  // ── State ────────────────────────────────────────────────────────────────────

  boardPrices: BoardPrice[] = [];
  boardPricesLoading = false;
  boardPricesError: string | null = null;

  showAddBoardForm = false;
  addBoardSaving = false;
  addBoardError: string | null = null;
  newBoard: CreateBoardPrice = this.emptyNewBoard();

  editingBoardId: number | null = null;
  editBoardPrice = 0;
  editBoardColorName: string | null = null;
  editBoardColorHex: string | null = null;
  editBoardSaving = false;

  csvImporting = false;
  csvImportResult: {
    added: number;
    updated: number;
    errors: { lineNumber: number; line: string; message: string }[];
  } | null = null;

  // ── Filters ───────────────────────────────────────────────────────────────────

  colorFilter = '';
  materialFilter = '';
  thicknessFilter: number | null = null;
  varnishedFilter: '' | 'true' | 'false' = '';

  get distinctMaterials(): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const bp of this.boardPrices) {
      if (!seen.has(bp.materialCode)) {
        seen.add(bp.materialCode);
        result.push(bp.materialCode);
      }
    }
    return result.sort();
  }

  get distinctThicknesses(): number[] {
    const seen = new Set<number>();
    const result: number[] = [];
    for (const bp of this.boardPrices) {
      if (!seen.has(bp.thicknessMm)) {
        seen.add(bp.thicknessMm);
        result.push(bp.thicknessMm);
      }
    }
    return result.sort((a, b) => a - b);
  }

  get filteredBoardPrices(): BoardPrice[] {
    let result = this.boardPrices;
    if (this.colorFilter) {
      const q = this.colorFilter.toLowerCase();
      result = result.filter(bp =>
        bp.colorCode.toLowerCase().includes(q) ||
        (bp.colorName?.toLowerCase().includes(q) ?? false)
      );
    }
    if (this.materialFilter) {
      result = result.filter(bp => bp.materialCode === this.materialFilter);
    }
    if (this.thicknessFilter !== null) {
      result = result.filter(bp => bp.thicknessMm === this.thicknessFilter);
    }
    if (this.varnishedFilter) {
      const v = this.varnishedFilter === 'true';
      result = result.filter(bp => bp.varnished === v);
    }
    return result;
  }

  get hasActiveFilters(): boolean {
    return !!(this.colorFilter || this.materialFilter || this.thicknessFilter !== null || this.varnishedFilter);
  }

  onFilterChange(): void {
    this.boardCurrentPage = 1;
    this.reconcileBoardSelectionToFilteredRows();
  }

  clearFilters(): void {
    this.colorFilter = '';
    this.materialFilter = '';
    this.thicknessFilter = null;
    this.varnishedFilter = '';
    this.boardCurrentPage = 1;
    this.reconcileBoardSelectionToFilteredRows();
  }

  // ── Page size ─────────────────────────────────────────────────────────────────

  readonly boardPageSizeOptions = [10, 25, 50, 100];
  boardPageSize = 10;

  setBoardPageSize(size: number): void {
    this.boardPageSize = size;
    this.boardCurrentPage = 1;
    this.clearBoardSelection();
  }

  // ── Pagination ────────────────────────────────────────────────────────────────

  boardCurrentPage = 1;

  get boardTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredBoardPrices.length / this.boardPageSize));
  }

  get boardPaginatedPrices(): BoardPrice[] {
    const start = (this.boardCurrentPage - 1) * this.boardPageSize;
    return this.filteredBoardPrices.slice(start, start + this.boardPageSize);
  }

  get boardPageNumbers(): number[] {
    return Array.from({ length: this.boardTotalPages }, (_, i) => i + 1);
  }

  get boardCurrentPageEnd(): number {
    return Math.min(this.boardCurrentPage * this.boardPageSize, this.filteredBoardPrices.length);
  }

  goToBoardPage(page: number): void {
    if (page >= 1 && page <= this.boardTotalPages) {
      this.boardCurrentPage = page;
    }
  }

  private resetPage(): void {
    this.boardCurrentPage = 1;
  }

  // ── Checkbox selection ────────────────────────────────────────────────────────

  selectedBoardIds = new Set<number>();

  get selectedBoardCount(): number {
    return this.selectedBoardIds.size;
  }

  get allCurrentPageBoardsSelected(): boolean {
    return this.boardPaginatedPrices.length > 0 &&
           this.boardPaginatedPrices.every(bp => this.selectedBoardIds.has(bp.id));
  }

  toggleAllCurrentPageBoards(): void {
    if (this.allCurrentPageBoardsSelected) {
      this.boardPaginatedPrices.forEach(bp => this.selectedBoardIds.delete(bp.id));
    } else {
      this.boardPaginatedPrices.forEach(bp => this.selectedBoardIds.add(bp.id));
    }
  }

  toggleBoardSelection(id: number): void {
    if (this.selectedBoardIds.has(id)) {
      this.selectedBoardIds.delete(id);
    } else {
      this.selectedBoardIds.add(id);
    }
  }

  clearBoardSelection(): void {
    this.selectedBoardIds = new Set<number>();
  }

  private reconcileBoardSelectionToFilteredRows(): void {
    if (this.selectedBoardIds.size === 0) {
      return;
    }
    const visibleIds = new Set(this.filteredBoardPrices.map(bp => bp.id));
    const nextSelection = new Set<number>();
    this.selectedBoardIds.forEach(id => {
      if (visibleIds.has(id)) {
        nextSelection.add(id);
      }
    });
    this.selectedBoardIds = nextSelection;
  }

  // ── Bulk set price for selected ───────────────────────────────────────────────

  bulkPrice = 0;
  bulkSaving = false;

  submitBulkForSelected(): void {
    if (this.selectedBoardIds.size === 0) return;
    const ids = Array.from(this.selectedBoardIds);
    this.bulkSaving = true;
    const requests = ids.map(id =>
      this.boardPriceService.update(id, { pricePerM2: this.bulkPrice })
    );
    forkJoin(requests).subscribe({
      next: () => {
        this.bulkSaving = false;
        this.clearBoardSelection();
        this.bulkPrice = 0;
        // Reload full list — GLOBAL boards get new OWN record with different id
        this.loadBoardPrices();
      },
      error: () => {
        this.bulkSaving = false;
      }
    });
  }

  // ── Bulk deactivate selected ──────────────────────────────────────────────────

  deactivatingSelected = false;

  deactivateSelected(): void {
    if (this.selectedBoardIds.size === 0) return;
    const ids = Array.from(this.selectedBoardIds);
    this.deactivatingSelected = true;
    this.boardPriceService.deactivateBulk(ids).subscribe({
      next: () => {
        // Reload full list — deactivating GLOBAL boards changes which boards are visible
        this.loadBoardPrices();
        this.deactivatingSelected = false;
        this.clearBoardSelection();
      },
      error: () => {
        this.deactivatingSelected = false;
      }
    });
  }

  // ── Delete (individual) ───────────────────────────────────────────────────────

  deletingBoardId: number | null = null;

  deleteBoard(id: number): void {
    this.deletingBoardId = id;
    this.boardPriceService.deactivate(id).subscribe({
      next: () => {
        this.deletingBoardId = null;
        // Reload full list — deactivating GLOBAL boards changes which boards are visible
        this.loadBoardPrices();
      },
      error: () => {
        this.deletingBoardId = null;
      }
    });
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadBoardPrices();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  getMaterialDisplay(bp: BoardPrice): string {
    return this.translations[bp.materialName] || bp.materialCode;
  }

  // ── Load ─────────────────────────────────────────────────────────────────────

  loadBoardPrices(): void {
    this.boardPricesLoading = true;
    this.boardPricesError = null;
    this.boardPriceService.list().subscribe({
      next: (prices) => {
        this.boardPrices = prices;
        this.boardPricesLoading = false;
        this.resetPage();
        this.reconcileBoardSelectionToFilteredRows();
        this.boardPricesChanged.emit(prices);
      },
      error: () => {
        this.boardPricesError = 'Nie udało się załadować cennika płyt.';
        this.boardPricesLoading = false;
      }
    });
  }

  // ── Add ──────────────────────────────────────────────────────────────────────

  toggleAddBoardForm(): void {
    this.showAddBoardForm = !this.showAddBoardForm;
    this.newBoard = this.emptyNewBoard();
    this.addBoardError = null;
  }

  submitAddBoard(): void {
    this.addBoardSaving = true;
    this.addBoardError = null;
    this.boardPriceService.create(this.newBoard).subscribe({
      next: (created) => {
        this.boardPrices = [...this.boardPrices, created];
        this.showAddBoardForm = false;
        this.newBoard = this.emptyNewBoard();
        this.addBoardSaving = false;
        this.boardPricesChanged.emit(this.boardPrices);
      },
      error: (err) => {
        this.addBoardError = err?.error?.message || 'Błąd podczas dodawania ceny.';
        this.addBoardSaving = false;
      }
    });
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────

  startEditBoard(bp: BoardPrice): void {
    this.editingBoardId = bp.id;
    this.editBoardPrice = bp.pricePerM2 ?? 0;
    this.editBoardColorName = bp.colorName;
    this.editBoardColorHex = bp.colorHex;
  }

  cancelEditBoard(): void {
    this.editingBoardId = null;
  }

  // TODO(CODEX): W tej sekcji obsługa błędów jest nierówna: edit, import CSV i pobieranie szablonu w części scenariuszy tylko gaszą loading albo kończą się bez żadnego komunikatu dla użytkownika. To psuje UX i utrudnia diagnostykę, bo część operacji zachowuje się jakby "nic się nie stało". Warto ujednolicić feedback błędów z resztą ustawień/core error handling.
  submitEditBoard(bp: BoardPrice): void {
    this.editBoardSaving = true;
    this.boardPriceService.update(bp.id, {
      pricePerM2: this.editBoardPrice,
      colorName: this.editBoardColorName ?? undefined,
      colorHex: this.editBoardColorHex ?? undefined
    }).subscribe({
      next: () => {
        this.editingBoardId = null;
        this.editBoardSaving = false;
        // Reload full list — GLOBAL boards get new OWN record with different id, so local map fails
        this.loadBoardPrices();
      },
      error: () => {
        this.editBoardSaving = false;
      }
    });
  }

  // ── CSV ──────────────────────────────────────────────────────────────────────

  downloadCsvTemplate(): void {
    this.boardPriceService.downloadTemplate().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'board_prices_template.csv';
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  onCsvFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.csvImportResult = {
        added: 0,
        updated: 0,
        errors: [{ lineNumber: 0, line: '', message: 'Plik jest zbyt duży. Maksymalny rozmiar: 10 MB' }]
      };
      input.value = '';
      return;
    }
    this.csvImporting = true;
    this.csvImportResult = null;
    this.boardPriceService.importCsv(file).subscribe({
      next: (result) => {
        this.csvImportResult = result;
        this.csvImporting = false;
        this.loadBoardPrices();
        input.value = '';
      },
      error: () => {
        this.csvImporting = false;
        input.value = '';
      }
    });
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private emptyNewBoard(): CreateBoardPrice {
    return {
      materialCode: '',
      thicknessMm: 18,
      colorCode: '',
      colorName: '',
      colorHex: '',
      varnished: false,
      pricePerM2: 0
    };
  }

  protected trackByIndex = (index: number) => index;
  protected trackByCode = (_: number, item: { code: string }) => item.code;
  protected trackById = (_: number, item: { id: number }) => item.id;
}
