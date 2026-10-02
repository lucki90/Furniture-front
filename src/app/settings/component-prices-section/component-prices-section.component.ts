import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import { ComponentPrice, ComponentPriceService } from '../component-price.service';
import {
  BulkSaveEvent,
  PriceEditTableComponent,
  PriceSaveEvent
} from '../price-edit-table/price-edit-table.component';

/** Owns loading, filtering and editing of the component price catalogue. */
@Component({
  selector: 'app-component-prices-section',
  templateUrl: './component-prices-section.component.html',
  styleUrls: ['../price-catalog-section.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PriceEditTableComponent]
})
export class ComponentPricesSectionComponent implements OnInit {

  private readonly componentPriceService = inject(ComponentPriceService);

  componentPrices: ComponentPrice[] = [];
  filteredComponentPrices: ComponentPrice[] = [];
  loading = false;
  error: string | null = null;
  categoryFilter = '';
  modelFilter = '';

  readonly rowClass = (price: ComponentPrice): string =>
    (!price.componentActive || !price.variantActive) ? 'inactive' : '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.componentPriceService.list().subscribe({
      next: prices => {
        this.componentPrices = prices;
        this.loading = false;
        this.recomputeFilter();
      },
      error: () => {
        this.error = 'Nie udało się załadować cennika komponentów.';
        this.loading = false;
      }
    });
  }

  get categories(): string[] {
    return [...new Set(this.componentPrices.map(price => price.category))].sort();
  }

  get models(): string[] {
    const source = this.categoryFilter
      ? this.componentPrices.filter(price => price.category === this.categoryFilter)
      : this.componentPrices;
    return [...new Set(source.map(price => price.modelCode))].sort();
  }

  onCategoryChange(category: string): void {
    this.categoryFilter = category;
    this.modelFilter = '';
    this.recomputeFilter();
  }

  onModelChange(model: string): void {
    this.modelFilter = model;
    this.recomputeFilter();
  }

  savePrice(event: PriceSaveEvent): void {
    this.componentPriceService.update(event.id, { pricePerUnit: event.price }).subscribe({
      next: updated => {
        this.replacePrices([updated]);
        event.complete(true);
      },
      error: () => event.complete(false)
    });
  }

  saveBulk(event: BulkSaveEvent): void {
    forkJoin(event.ids.map(id =>
      this.componentPriceService.update(id, { pricePerUnit: event.price })
    )).subscribe({
      next: updated => {
        this.replacePrices(updated);
        event.complete(true);
      },
      error: () => event.complete(false)
    });
  }

  private replacePrices(updated: ComponentPrice[]): void {
    const updatesById = new Map(updated.map(price => [price.id, price]));
    this.componentPrices = this.componentPrices.map(price => updatesById.get(price.id) ?? price);
    this.recomputeFilter();
  }

  private recomputeFilter(): void {
    this.filteredComponentPrices = this.componentPrices.filter(price =>
      (!this.categoryFilter || price.category === this.categoryFilter) &&
      (!this.modelFilter || price.modelCode === this.modelFilter)
    );
  }

  protected readonly trackByValue = (_: number, value: string) => value;
}
