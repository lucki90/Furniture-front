import { Component, OnInit, signal, computed } from '@angular/core';
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import { PriceAdminService } from '../../service/price-admin.service';
import { PriceEntryAdminResponse, ScrapingResultResponse } from '../../model/price-entry.model';
import { PriceDialogComponent } from '../price-dialog/price-dialog.component';
import { PriceImportDialogComponent } from '../price-import-dialog/price-import-dialog.component';

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
    MatSnackBarModule,
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

  constructor(
    private readonly priceService: PriceAdminService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

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
    ).subscribe({
      next: (page) => {
        this.prices.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: (err) => {
        this.snackBar.open('Błąd podczas ładowania cen', 'Zamknij', { duration: 3000 });
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
      width: '600px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPrices();
        this.snackBar.open('Cena została dodana', 'Zamknij', { duration: 3000 });
      }
    });
  }

  openEditDialog(price: PriceEntryAdminResponse): void {
    const dialogRef = this.dialog.open(PriceDialogComponent, {
      width: '600px',
      data: { mode: 'edit', price }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadPrices();
        this.snackBar.open('Cena została zaktualizowana', 'Zamknij', { duration: 3000 });
      }
    });
  }

  onDelete(price: PriceEntryAdminResponse): void {
    if (confirm(`Czy na pewno chcesz usunąć cenę "${price.name || price.id}"?`)) {
      this.priceService.delete(price.id).subscribe({
        next: () => {
          this.loadPrices();
          this.snackBar.open('Cena została usunięta', 'Zamknij', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open('Błąd podczas usuwania ceny', 'Zamknij', { duration: 3000 });
          console.error('Error deleting price:', err);
        }
      });
    }
  }

  onScrapeSingle(price: PriceEntryAdminResponse): void {
    if (!price.sourceUrl) {
      this.snackBar.open('Brak URL do scrapowania', 'Zamknij', { duration: 3000 });
      return;
    }

    this.scrapingInProgress.set(true);
    this.priceService.scrapeSingle(price.id).subscribe({
      next: (result) => {
        this.scrapingInProgress.set(false);
        this.handleScrapingResult(result);
        this.loadPrices();
      },
      error: (err) => {
        this.scrapingInProgress.set(false);
        this.snackBar.open('Błąd podczas scrapowania', 'Zamknij', { duration: 3000 });
        console.error('Error scraping price:', err);
      }
    });
  }

  onScrapeAll(): void {
    if (!confirm('Czy na pewno chcesz uruchomić scraping dla wszystkich cen? To może potrwać kilka minut.')) {
      return;
    }

    this.scrapingInProgress.set(true);
    this.priceService.scrapeAll().subscribe({
      next: (result) => {
        this.scrapingInProgress.set(false);
        this.snackBar.open(
          `Scraping zakończony: ${result.successfulScrapes}/${result.totalPriceEntries} sukces, ${result.failedScrapes} błędów`,
          'Zamknij',
          { duration: 5000 }
        );
        this.loadPrices();
      },
      error: (err) => {
        this.scrapingInProgress.set(false);
        this.snackBar.open('Błąd podczas scrapowania', 'Zamknij', { duration: 3000 });
        console.error('Error scraping all prices:', err);
      }
    });
  }

  openImportDialog(): void {
    const dialogRef = this.dialog.open(PriceImportDialogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
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
      this.snackBar.open(
        `Scraping udany: ${result.previousPrice?.toFixed(2)} → ${result.newPrice?.toFixed(2)} PLN ${diffText}`,
        'Zamknij',
        { duration: 4000 }
      );
    } else {
      this.snackBar.open(
        `Scraping nieudany: ${result.errorMessage}`,
        'Zamknij',
        { duration: 4000 }
      );
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
