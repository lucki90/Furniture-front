import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import { MaterialAdminService } from '../../service/material-admin.service';
import { BoardVariantAdminResponse } from '../../model/material-variant.model';
import { VariantDialogComponent, VariantDialogData } from '../variant-dialog/variant-dialog.component';
import { CsvImportDialogComponent } from '../csv-import-dialog/csv-import-dialog.component';
import { TranslationService } from '../../../../translation/translation.service';
import { LanguageService } from '../../../../service/language.service';

@Component({
  selector: 'app-board-variant-list',
  templateUrl: './board-variant-list.component.html',
  styleUrls: ['./board-variant-list.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule
  ]
})
export class BoardVariantListComponent implements OnInit {

  displayedColumns: string[] = ['materialCode', 'thicknessMm', 'colorCode', 'varnished', 'currentPrice', 'active', 'actions'];

  variants = signal<BoardVariantAdminResponse[]>([]);
  totalElements = signal(0);
  pageSize = signal(20);
  pageIndex = signal(0);
  loading = signal(false);

  // Translation map: translationKey → resolved name
  translations = signal<Record<string, string>>({});

  searchMaterialCode = '';
  activeOnly = false;

  private readonly translationService = inject(TranslationService);
  private readonly languageService = inject(LanguageService);

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly materialService: MaterialAdminService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {
    // Reload translations whenever language changes (toObservable emits current value immediately)
    toObservable(this.languageService.lang).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(lang => this.loadTranslations(lang));
  }

  ngOnInit(): void {
    this.loadVariants();
  }

  private loadTranslations(lang: string): void {
    this.translationService.getByCategories(['MATERIAL', 'BOARD_VARIANT'], lang).subscribe(t => {
      // Spread to always create a NEW object reference — prevents Angular signal
      // from skipping re-render when the same cached Map is returned (e.g. lang switch back)
      this.translations.set({ ...t });
    });
  }

  /**
   * Resolve display name: translation → colorName → colorCode.
   *
   * TODO: Translacja koloru (zmiana języka) nie działa dla istniejących wariantów z dwóch powodów:
   *  1. Większość wariantów w DB nie ma ustawionego `translationKey` → spada do colorName/colorCode.
   *     Rozwiązanie: w dialogu edycji ustawić klucz (np. "BOARD_VARIANT.BIALY_18") i zapisać PL/EN.
   *  2. Nawet gdy `translationKey` jest ustawiony, musi istnieć wpis w tabeli `translation` dla
   *     odpowiedniego języka — teraz można to zrobić przez sekcję "Tłumaczenia" w dialogu wariantu.
   *  3. Kategoria pobierania: `getByCategories(['MATERIAL', 'BOARD_VARIANT'], lang)` — jeśli klucz
   *     wariantu należy do innej kategorii, nie zostanie zwrócony. Upewnij się, że klucz ma prefix
   *     pasujący do jednej z pobieranych kategorii (np. "BOARD_VARIANT." lub "MATERIAL.").
   */
  getColorDisplay(v: BoardVariantAdminResponse): string {
    const t = this.translations();
    if (v.translationKey && t[v.translationKey]) {
      return t[v.translationKey];
    }
    return v.colorName || v.colorCode;
  }

  getMaterialDisplay(v: BoardVariantAdminResponse): string {
    const t = this.translations();
    if (v.materialName && t[v.materialName]) {
      return t[v.materialName];
    }
    return v.materialCode;
  }

  loadVariants(): void {
    this.loading.set(true);
    this.materialService.getBoardVariants(
      this.pageIndex(),
      this.pageSize(),
      this.searchMaterialCode || undefined,
      this.activeOnly
    ).subscribe({
      next: (page) => {
        this.variants.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: (err) => {
        this.snackBar.open('Błąd podczas ładowania wariantów płyt', 'Zamknij', { duration: 3000 });
        this.loading.set(false);
        console.error('Error loading board variants:', err);
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadVariants();
  }

  onSearch(): void {
    this.pageIndex.set(0);
    this.loadVariants();
  }

  onClearSearch(): void {
    this.searchMaterialCode = '';
    this.pageIndex.set(0);
    this.loadVariants();
  }

  openImportDialog(): void {
    const dialogRef = this.dialog.open(CsvImportDialogComponent, {
      width: '550px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadVariants();
        this.snackBar.open('Import zakończony pomyślnie', 'Zamknij', { duration: 3000 });
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(VariantDialogComponent, {
      width: '600px',
      data: { mode: 'create', type: 'board' } as VariantDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadVariants();
        this.snackBar.open('Wariant płyty został dodany', 'Zamknij', { duration: 3000 });
      }
    });
  }

  openEditDialog(variant: BoardVariantAdminResponse): void {
    const dialogRef = this.dialog.open(VariantDialogComponent, {
      width: '600px',
      data: { mode: 'edit', type: 'board', variant } as VariantDialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadVariants();
        this.snackBar.open('Wariant płyty został zaktualizowany', 'Zamknij', { duration: 3000 });
      }
    });
  }

  onDelete(variant: BoardVariantAdminResponse): void {
    if (confirm(`Czy na pewno chcesz usunąć wariant "${variant.materialCode} ${variant.thicknessMm}mm ${variant.colorCode}"?`)) {
      this.materialService.deleteBoardVariant(variant.id).subscribe({
        next: () => {
          this.loadVariants();
          this.snackBar.open('Wariant płyty został usunięty', 'Zamknij', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open('Błąd podczas usuwania wariantu', 'Zamknij', { duration: 3000 });
          console.error('Error deleting board variant:', err);
        }
      });
    }
  }
}
