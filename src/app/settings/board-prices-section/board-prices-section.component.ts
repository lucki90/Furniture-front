import { Component, Input, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { FormFieldComponent } from '../../shared/form-field/form-field.component';
import { BoardPriceService, BoardPrice, CreateBoardPrice } from '../board-price.service';
import { MaterialOption } from '../../admin/material/model/material-variant.model';

/**
 * Sekcja "Cennik płyt" wydzielona z SettingsComponent (R.2.3).
 *
 * Odpowiedzialności:
 * - Ładowanie, dodawanie i edytowanie cen płyt (BoardPriceService)
 * - Import CSV + pobieranie szablonu
 * - Emitowanie boardPricesChanged po każdej zmianie (parent przebudowuje listy kolorów)
 *
 * Zero zmian zachowania — czysta ekstrakcja.
 */
@Component({
  selector: 'app-board-prices-section',
  templateUrl: './board-prices-section.component.html',
  styleUrls: ['./board-prices-section.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, FormFieldComponent, MatExpansionModule, MatIconModule],
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

  submitEditBoard(bp: BoardPrice): void {
    this.editBoardSaving = true;
    this.boardPriceService.update(bp.id, {
      pricePerM2: this.editBoardPrice,
      colorName: this.editBoardColorName ?? undefined,
      colorHex: this.editBoardColorHex ?? undefined
    }).subscribe({
      next: (updated) => {
        this.boardPrices = this.boardPrices.map(p => p.id === updated.id ? updated : p);
        this.editingBoardId = null;
        this.editBoardSaving = false;
        this.boardPricesChanged.emit(this.boardPrices);
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
