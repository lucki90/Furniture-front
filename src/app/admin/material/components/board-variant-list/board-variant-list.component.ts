import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ToastService } from '../../../../core/error/toast.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import { MaterialAdminService } from '../../service/material-admin.service';
import { BoardVariantAdminResponse } from '../../model/material-variant.model';
import { VariantDialogComponent, VariantDialogData } from '../variant-dialog/variant-dialog.component';
import { CsvImportDialogComponent } from '../csv-import-dialog/csv-import-dialog.component';
import { TranslationService } from '../../../../translation/translation.service';
import { LanguageService } from '../../../../service/language.service';
import { ConfirmDialogService } from '../../../../shared/confirm-dialog/confirm-dialog.service';
import { DIALOG_WIDTH } from '../../../../shared/constants/dialog.constants';

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
    MatSelectModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule
  ]
})
// TODO R.11: Ten komponent ma ~80% wspolnej logiki z component-variant-list i job-variant-list
// (paginacja, wyszukiwanie, dialogi CRUD, pattern delete). Wydzielic do
// BaseVariantListComponent<T> lub uzyc composition z useVariantList() serwisu.
export class BoardVariantListComponent implements OnInit {
  displayedColumns: string[] = ['materialCode', 'thicknessMm', 'colorCode', 'varnished', 'currentPrice', 'active', 'actions'];

  variants = signal<BoardVariantAdminResponse[]>([]);
  totalElements = signal(0);
  pageSize = signal(20);
  pageIndex = signal(0);
  loading = signal(false);

  // Translation map: translationKey -> resolved name
  translations = signal<Record<string, string>>({});

  searchMaterialCode = '';
  activeOnly = false;

  private readonly translationService = inject(TranslationService);
  private readonly languageService = inject(LanguageService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly materialService: MaterialAdminService,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService
  ) {
    toObservable(this.languageService.lang).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(lang => this.loadTranslations(lang));
  }

  ngOnInit(): void {
    this.loadVariants();
  }

  get totalVariantsLabel(): string {
    return this.pluralize(this.totalElements(), 'wariant', 'warianty', 'wariantow');
  }

  private loadTranslations(lang: string): void {
    this.translationService.getByCategories(['MATERIAL', 'BOARD_VARIANT'], lang).subscribe(translations => {
      this.translations.set({ ...translations });
    });
  }

  // Fallback do colorName/colorCode gdy wariant nie ma translationKey w DB (data-quality issue, nie błąd kodu).
  getColorDisplay(variant: BoardVariantAdminResponse): string {
    const translations = this.translations();
    if (variant.translationKey && translations[variant.translationKey]) {
      return translations[variant.translationKey];
    }

    return variant.colorName || variant.colorCode;
  }

  getMaterialDisplay(variant: BoardVariantAdminResponse): string {
    const translations = this.translations();
    if (variant.materialName && translations[variant.materialName]) {
      return translations[variant.materialName];
    }

    return variant.materialCode;
  }

  loadVariants(): void {
    this.loading.set(true);
    this.materialService.getBoardVariants(
      this.pageIndex(),
      this.pageSize(),
      this.searchMaterialCode || undefined,
      this.activeOnly
    ).subscribe({
      next: page => {
        this.variants.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: err => {
        this.toast.error('Błąd podczas ładowania wariantów płyt');
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

    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (result) {
        this.loadVariants();
        this.toast.success('Import zakończony pomyślnie');
      }
    });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(VariantDialogComponent, {
      width: DIALOG_WIDTH.WIDE,
      data: { mode: 'create', type: 'board' } as VariantDialogData
    });

    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (result) {
        this.loadVariants();
        this.toast.success('Wariant płyty został dodany');
      }
    });
  }

  openEditDialog(variant: BoardVariantAdminResponse): void {
    const dialogRef = this.dialog.open(VariantDialogComponent, {
      width: DIALOG_WIDTH.WIDE,
      data: { mode: 'edit', type: 'board', variant } as VariantDialogData
    });

    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (result) {
        this.loadVariants();
        this.toast.success('Wariant płyty został zaktualizowany');
      }
    });
  }

  onDelete(variant: BoardVariantAdminResponse): void {
    this.confirmDialog.confirm({
      message: `Czy na pewno chcesz usunąć wariant "${variant.materialCode} ${variant.thicknessMm}mm ${variant.colorCode}"?`,
      confirmText: 'Tak'
    }).pipe(
      filter(Boolean),
      switchMap(() => this.materialService.deleteBoardVariant(variant.id)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.loadVariants();
        this.toast.success('Wariant płyty został usunięty');
      },
      error: err => {
        this.toast.error('Błąd podczas usuwania wariantu');
        console.error('Error deleting board variant:', err);
      }
    });
  }

  private pluralize(count: number, singular: string, paucal: string, plural: string): string {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (count === 1) {
      return `${count} ${singular}`;
    }

    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return `${count} ${paucal}`;
    }

    return `${count} ${plural}`;
  }
}
