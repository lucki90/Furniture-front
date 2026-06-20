import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { ToastService } from '../../../../core/error/toast.service';
import { MaterialAdminService } from '../../service/material-admin.service';
import { BoardVariantAdminResponse } from '../../model/material-variant.model';
import { VariantDialogComponent, VariantDialogData } from '../variant-dialog/variant-dialog.component';
import { CsvImportDialogComponent } from '../csv-import-dialog/csv-import-dialog.component';
import { TranslationService } from '../../../../translation/translation.service';
import { LanguageService } from '../../../../service/language.service';
import { ConfirmDialogService } from '../../../../shared/confirm-dialog/confirm-dialog.service';
import { DIALOG_WIDTH } from '../../../../shared/constants/dialog.constants';
import { VariantListBase } from '../variant-list-base';

@Component({
  selector: 'app-board-variant-list',
  templateUrl: './board-variant-list.component.html',
  styleUrls: ['./board-variant-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule,
    MatDialogModule, MatProgressSpinnerModule, MatTooltipModule, MatChipsModule,
  ],
})
export class BoardVariantListComponent extends VariantListBase<BoardVariantAdminResponse> implements OnInit {
  displayedColumns: string[] = ['materialCode', 'thicknessMm', 'colorCode', 'varnished', 'currentPrice', 'active', 'actions'];
  override pageSize = signal(20);

  translations = signal<Record<string, string>>({});

  private readonly materialService = inject(MaterialAdminService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly translationService = inject(TranslationService);
  private readonly languageService = inject(LanguageService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  constructor() {
    super();
    toObservable(this.languageService.lang).pipe(
      switchMap(lang => this.translationService.getByCategories(['MATERIAL', 'BOARD_VARIANT'], lang)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(translations => this.translations.set({ ...translations }));
  }

  ngOnInit(): void {
    this.loadVariants();
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

  override loadVariants(): void {
    this.loading.set(true);
    this.materialService.getBoardVariants(
      this.pageIndex(), this.pageSize(), this.searchQuery || undefined, this.activeOnly
    ).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: page => {
        this.variants.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Błąd podczas ładowania wariantów płyt');
        this.loading.set(false);
      },
    });
  }

  onClearSearch(): void {
    this.searchQuery = '';
    this.onSearch();
  }

  openImportDialog(): void {
    this.dialog.open(CsvImportDialogComponent, {
      width: '550px',
    }).afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (result) {
        this.loadVariants();
        this.toast.success('Import zakończony pomyślnie');
      }
    });
  }

  openCreateDialog(): void {
    this.dialog.open(VariantDialogComponent, {
      width: DIALOG_WIDTH.WIDE,
      data: { mode: 'create', type: 'board' } as VariantDialogData,
    }).afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (result) {
        this.loadVariants();
        this.toast.success('Wariant płyty został dodany');
      }
    });
  }

  openEditDialog(variant: BoardVariantAdminResponse): void {
    this.dialog.open(VariantDialogComponent, {
      width: DIALOG_WIDTH.WIDE,
      data: { mode: 'edit', type: 'board', variant } as VariantDialogData,
    }).afterClosed().pipe(
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
      confirmText: 'Tak',
    }).pipe(
      filter(Boolean),
      switchMap(() => this.materialService.deleteBoardVariant(variant.id)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.loadVariants();
        this.toast.success('Wariant płyty został usunięty');
      },
      error: () => this.toast.error('Błąd podczas usuwania wariantu'),
    });
  }
}
