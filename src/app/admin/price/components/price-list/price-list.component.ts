import { Component, DestroyRef, OnInit, signal, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, switchMap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ToastService } from '../../../../core/error/toast.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import { PriceAdminService } from '../../service/price-admin.service';
import { PriceEntryAdminResponse, ScrapingResultResponse } from '../../model/price-entry.model';
import { PriceDialogComponent } from '../price-dialog/price-dialog.component';
import { PriceImportDialogComponent } from '../price-import-dialog/price-import-dialog.component';
import { ConfirmDialogService } from '../../../../shared/confirm-dialog/confirm-dialog.service';
import { DIALOG_WIDTH } from '../../../../shared/constants/dialog.constants';

@Component({
  selector: 'app-price-list',
  templateUrl: './price-list.component.html',
  styleUrls: ['./price-list.component.css'],
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
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule
  ]
})
export class PriceListComponent implements OnInit {

  displayedColumns: string[] = ['id', 'name', 'unit', 'currentPrice', 'sourceUrl', 'isActive', 'actions'];

  // Signals dla stanu
  prices = signal<PriceEntryAdminResponse[]>([]);
  totalElements = signal(0);
  pageSize = signal(20);
  pageIndex = signal(0);
  loading = signal(false);
  scrapingInProgress = signal(false);

  // Filtry
  searchName = '';
  activeOnly = false;

  private readonly priceService: PriceAdminService = inject(PriceAdminService);
  private readonly dialog: MatDialog = inject(MatDialog);
  private readonly toast: ToastService = inject(ToastService);
  private readonly confirmDialog: ConfirmDialogService = inject(ConfirmDialogService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.loadPrices();
  }

  loadPrices(): void {
    this.loading.set(true);
    this.priceService.getAll(
      this.pageIndex(),
      this.pageSize(),
      this.searchName || undefined,
      this.activeOnly
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (page) => {
        this.prices.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.error('Błąd podczas ładowania cen');
        this.loading.set(false);
        console.error('Error loading prices:', err);
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadPrices();
  }

  onSearch(): void {
    this.pageIndex.set(0);
    this.loadPrices();
  }

  onClearSearch(): void {
    this.searchName = '';
    this.pageIndex.set(0);
    this.loadPrices();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(PriceDialogComponent, {
      width: DIALOG_WIDTH.WIDE,
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (result) {
        this.loadPrices();
        this.toast.success('Cena została dodana');
      }
    });
  }

  openEditDialog(price: PriceEntryAdminResponse): void {
    const dialogRef = this.dialog.open(PriceDialogComponent, {
      width: '600px',
      data: { mode: 'edit', price }
    });

    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (result) {
        this.loadPrices();
        this.toast.success('Cena została zaktualizowana');
      }
    });
  }

  onDelete(price: PriceEntryAdminResponse): void {
    this.confirmDialog.confirm({
      message: `Czy na pewno chcesz usunąć cenę "${price.name || price.id}"?`,
      confirmText: 'Tak'
    }).pipe(
      filter(Boolean),
      switchMap(() => this.priceService.delete(price.id)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.loadPrices();
        this.toast.success('Cena została usunięta');
      },
      error: (err) => {
        this.toast.error('Błąd podczas usuwania ceny');
        console.error('Error deleting price:', err);
      }
    });
  }

  onScrapeSingle(price: PriceEntryAdminResponse): void {
    if (!price.sourceUrl) {
      this.toast.error('Brak URL do scrapowania');
      return;
    }

    this.scrapingInProgress.set(true);
    this.priceService.scrapeSingle(price.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.scrapingInProgress.set(false);
        this.handleScrapingResult(result);
        this.loadPrices();
      },
      error: (err) => {
        this.scrapingInProgress.set(false);
        this.toast.error('Błąd podczas scrapowania');
        console.error('Error scraping price:', err);
      }
    });
  }

  onScrapeAll(): void {
    this.confirmDialog.confirm({
      message: 'Czy na pewno chcesz uruchomić scraping dla wszystkich cen? To może potrwać kilka minut.',
      confirmText: 'Tak'
    }).pipe(
      filter(Boolean),
      switchMap(() => {
        this.scrapingInProgress.set(true);
        return this.priceService.scrapeAll();
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (result) => {
        this.scrapingInProgress.set(false);
        this.toast.success(`Scraping zakończony: ${result.successfulScrapes}/${result.totalPriceEntries} sukces, ${result.failedScrapes} błędów`);
        this.loadPrices();
      },
      error: (err) => {
        this.scrapingInProgress.set(false);
        this.toast.error('Błąd podczas scrapowania');
        console.error('Error scraping all prices:', err);
      }
    });
  }

  openImportDialog(): void {
    const dialogRef = this.dialog.open(PriceImportDialogComponent, {
      width: DIALOG_WIDTH.STANDARD
    });

    dialogRef.afterClosed().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      if (result) {
        this.loadPrices();
      }
    });
  }

  private handleScrapingResult(result: ScrapingResultResponse): void {
    if (result.success) {
      const diff = result.priceDifference;
      const diffText = diff !== null
        ? (diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2))
        : '';
      this.toast.success(`Scraping udany: ${result.previousPrice?.toFixed(2)} → ${result.newPrice?.toFixed(2)} PLN ${diffText}`);
    } else {
      this.toast.error(`Scraping nieudany: ${result.errorMessage}`);
    }
  }

  formatUrl(url: string | null): string {
    if (!url) return '-';
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url.substring(0, 30) + '...';
    }
  }
}
