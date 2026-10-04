import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageEvent } from '@angular/material/paginator';
import { Observable, Subscription } from 'rxjs';
import { Page } from '../model/material-variant.model';

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

  private activeRequest?: Subscription;

  abstract loadVariants(): void;

  /**
   * Pobiera stronę wariantów; tylko ostatnie wywołanie może zmienić dane, licznik, loading i pokazać błąd.
   * Poprzednie, jeszcze trwające żądanie jest anulowane (jego odpowiedź ani błąd nie są już obsługiwane).
   */
  protected loadPage(source$: Observable<Page<T>>, onError: () => void): void {
    this.activeRequest?.unsubscribe();
    this.loading.set(true);
    this.activeRequest = source$.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: page => {
        this.variants.set(page.content);
        this.totalElements.set(page.totalElements);
        this.loading.set(false);
      },
      error: () => {
        onError();
        this.loading.set(false);
      },
    });
  }

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
