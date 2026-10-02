import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { JobPrice, JobPriceService } from '../job-price.service';
import {
  BulkSaveEvent,
  PriceEditTableComponent,
  PriceSaveEvent
} from '../price-edit-table/price-edit-table.component';

/** Owns loading, filtering and editing of the job price catalogue. */
@Component({
  selector: 'app-job-prices-section',
  templateUrl: './job-prices-section.component.html',
  styleUrls: ['../price-catalog-section.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PriceEditTableComponent]
})
export class JobPricesSectionComponent implements OnInit {

  private readonly jobPriceService = inject(JobPriceService);

  jobPrices: JobPrice[] = [];
  filteredJobPrices: JobPrice[] = [];
  loading = false;
  error: string | null = null;
  categoryFilter = '';
  variantFilter = '';

  readonly rowClass = (price: JobPrice): string =>
    (!price.jobActive || !price.variantActive) ? 'inactive' : '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.jobPriceService.list().subscribe({
      next: prices => {
        this.jobPrices = prices;
        this.loading = false;
        this.recomputeFilter();
      },
      error: () => {
        this.error = 'Nie udało się załadować cennika prac.';
        this.loading = false;
      }
    });
  }

  get categories(): string[] {
    return [...new Set(this.jobPrices.map(price => price.jobCategory))].sort();
  }

  get variants(): string[] {
    const source = this.categoryFilter
      ? this.jobPrices.filter(price => price.jobCategory === this.categoryFilter)
      : this.jobPrices;
    return [...new Set(source.map(price => price.variantCode))].sort();
  }

  onCategoryChange(category: string): void {
    this.categoryFilter = category;
    this.variantFilter = '';
    this.recomputeFilter();
  }

  onVariantChange(variant: string): void {
    this.variantFilter = variant;
    this.recomputeFilter();
  }

  savePrice(event: PriceSaveEvent): void {
    this.jobPriceService.update(event.id, { pricePerUnit: event.price }).subscribe({
      next: updated => {
        this.replacePrices([updated]);
        event.complete(true);
      },
      error: () => event.complete(false)
    });
  }

  saveBulk(event: BulkSaveEvent): void {
    forkJoin(event.ids.map(id =>
      this.jobPriceService.update(id, { pricePerUnit: event.price })
    )).subscribe({
      next: updated => {
        this.replacePrices(updated);
        event.complete(true);
      },
      error: () => event.complete(false)
    });
  }

  private replacePrices(updated: JobPrice[]): void {
    const updatesById = new Map(updated.map(price => [price.id, price]));
    this.jobPrices = this.jobPrices.map(price => updatesById.get(price.id) ?? price);
    this.recomputeFilter();
  }

  private recomputeFilter(): void {
    this.filteredJobPrices = this.jobPrices.filter(price =>
      (!this.categoryFilter || price.jobCategory === this.categoryFilter) &&
      (!this.variantFilter || price.variantCode === this.variantFilter)
    );
  }

  protected readonly trackByValue = (_: number, value: string) => value;
}
