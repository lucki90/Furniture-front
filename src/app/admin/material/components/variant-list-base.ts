import { DestroyRef, inject, signal } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';

/**
 * Abstrakcyjna baza dla list wariantów (płyty, komponenty, prace).
 * Zawiera wspólny stan paginacji, filtry i metody nawigacji.
 * Subklasy muszą zaimplementować {@link loadVariants} z wywołaniem odpowiedniego endpointu.
 */
export abstract class VariantListBase<T> {
  variants = signal<T[]>([]);
  totalElements = signal(0);
  pageSize = signal(10);
  pageIndex = signal(0);
  loading = signal(false);

  searchQuery = '';
  activeOnly = false;

  protected readonly destroyRef = inject(DestroyRef);

  abstract loadVariants(): void;

  get totalVariantsLabel(): string {
    return pluralizeVariants(this.totalElements());
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

  onActiveFilterChange(): void {
    this.pageIndex.set(0);
    this.loadVariants();
  }
}

/** Polska odmiana słowa „wariant" przez liczbę. */
export function pluralizeVariants(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (count === 1) {
    return `${count} wariant`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} warianty`;
  }

  return `${count} wariantów`;
}
