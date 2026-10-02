import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from, of, Subject } from 'rxjs';
import { takeUntil, finalize, switchMap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { PricingBreakdown, OfferOptionsRequest, OfferViewImage } from './project-pricing.service';
import { KitchenProjectPricingFacade, PricingFormState, PricingLoadResult } from './kitchen-project-pricing.facade';
import { KitchenProjectExportFacade } from './kitchen-project-export.facade';
import { KitchenStateService } from './kitchen-state.service';
import { ToastService } from '../../core/error/toast.service';
import { OfferDialogOptions, OfferOptionsDialogComponent } from '../offer-options-dialog/offer-options-dialog.component';
import { buildPricingViewStateFromResult } from '../kitchen-page-view-state';
import { OfferViewsService } from '../offer-views/offer-views.service';

const DEFAULT_OFFER_OPTIONS: OfferDialogOptions = {
  showCostDetails: true,
  frontDescription: '',
  countertopDescription: '',
  hardwareDescription: 'Blum',
  includeViews: true
};

/**
 * Zarządza stanem wyceny projektu: sygnały UI, ładowanie/zapis przez API,
 * pobieranie PDF oferty z dialogiem opcji (z widokami poglądowymi rysowanymi przed wysłaniem).
 * Wydzielony z KitchenPageComponent (FE-36).
 */
@Injectable()
export class KitchenPagePricingService {
  private stateService = inject(KitchenStateService);
  private pricingFacade = inject(KitchenProjectPricingFacade);
  private exportFacade = inject(KitchenProjectExportFacade);
  private offerViews = inject(OfferViewsService);
  private dialog = inject(MatDialog);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  readonly pricing = signal<PricingBreakdown | null>(null);
  readonly isPricingLoading = signal(false);
  readonly isPricingSaving = signal(false);
  readonly isPdfDownloading = signal(false);
  readonly pricingDiscountPct = signal(0);
  readonly pricingManualOverrideEnabled = signal(false);
  readonly pricingManualOverride = signal<number | null>(null);
  readonly pricingOfferNotes = signal('');

  private lastOfferOptions: OfferDialogOptions = { ...DEFAULT_OFFER_OPTIONS };
  private cancelPricingRequest$ = new Subject<void>();
  private cancelPdfRequest$ = new Subject<void>();

  loadPricing(): void {
    const id = this.stateService.currentProjectId();
    if (!id) return;
    this.cancelPricingRequest$.next();
    this.isPricingLoading.set(true);
    this.pricingFacade.loadPricing(id).pipe(
      takeUntil(this.cancelPricingRequest$),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isPricingLoading.set(false))
    ).subscribe({
      next: result => { this.applyPricingResult(result); },
      error: () => {}
    });
  }

  savePricing(): void {
    const id = this.stateService.currentProjectId();
    if (!id) return;
    this.cancelPricingRequest$.next();
    this.isPricingSaving.set(true);
    this.pricingFacade.savePricing(id, this.buildFormState()).pipe(
      takeUntil(this.cancelPricingRequest$),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isPricingSaving.set(false))
    ).subscribe({
      next: result => { this.applyPricingResult(result); },
      error: () => {}
    });
  }

  downloadOfferPdf(bomPriceWarning: string | null): void {
    const id = this.stateService.currentProjectId();
    if (!id) return;
    this.cancelPdfRequest$.next();

    if (bomPriceWarning) {
      this.toast.warning(bomPriceWarning);
    }

    const dialogRef = this.dialog.open(OfferOptionsDialogComponent, {
      width: '480px',
      data: this.lastOfferOptions
    });
    dialogRef.afterClosed().pipe(
      takeUntil(this.cancelPdfRequest$),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((dialogOptions: OfferDialogOptions | undefined) => {
      if (!dialogOptions) return;
      this.lastOfferOptions = dialogOptions;
      const { includeViews, ...options } = dialogOptions;
      this.isPdfDownloading.set(true);
      (includeViews ? from(this.prepareOfferViews()) : of([])).pipe(
        switchMap(views => this.exportFacade.downloadOfferPdf({ projectId: id, options: withViews(options, views) })),
        takeUntil(this.cancelPdfRequest$),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isPdfDownloading.set(false))
      ).subscribe({
        next: result => {
          this.toast.success(`Oferta PDF została zapisana przy projekcie i pobrana: ${result.filename}`);
        },
        error: () => {}
      });
    });
  }

  setDiscountPct(value: number): void { this.pricingDiscountPct.set(value); }
  setManualOverride(value: number | null): void { this.pricingManualOverride.set(value); }
  setManualOverrideEnabled(value: boolean): void { this.pricingManualOverrideEnabled.set(value); }
  setOfferNotes(value: string): void { this.pricingOfferNotes.set(value); }

  reset(): void {
    this.cancelPricingRequest$.next();
    this.cancelPdfRequest$.next();
    this.pricing.set(null);
    this.isPricingLoading.set(false);
    this.isPricingSaving.set(false);
    this.isPdfDownloading.set(false);
    this.pricingDiscountPct.set(0);
    this.pricingManualOverrideEnabled.set(false);
    this.pricingManualOverride.set(null);
    this.pricingOfferNotes.set('');
  }

  /**
   * Widoki z bieżącego stanu edytora. Cena oferty pochodzi z zapisanego projektu, więc przy niezapisanych zmianach
   * rysunek może się z nią nie zgadzać — ostrzegamy. Błąd rysowania nie blokuje oferty: powstaje bez widoków.
   */
  private async prepareOfferViews(): Promise<OfferViewImage[]> {
    if (this.stateService.hasUnsavedChanges()) {
      this.toast.warning('Projekt ma niezapisane zmiany — widoki pokażą stan edytora, a cena zapisany projekt.');
    }
    try {
      return await this.offerViews.render();
    } catch {
      this.toast.warning('Nie udało się przygotować widoków poglądowych — oferta powstanie bez rysunków.');
      return [];
    }
  }

  private buildFormState(): PricingFormState {
    return {
      discountPct: this.pricingDiscountPct(),
      manualOverrideEnabled: this.pricingManualOverrideEnabled(),
      manualOverride: this.pricingManualOverride(),
      offerNotes: this.pricingOfferNotes()
    };
  }

  private applyPricingResult(result: PricingLoadResult): void {
    const state = buildPricingViewStateFromResult(result);
    this.pricing.set(state.pricing);
    this.pricingDiscountPct.set(state.pricingDiscountPct);
    this.pricingManualOverrideEnabled.set(state.pricingManualOverrideEnabled);
    this.pricingManualOverride.set(state.pricingManualOverride);
    this.pricingOfferNotes.set(state.pricingOfferNotes);
  }
}

function withViews(options: OfferOptionsRequest, views: OfferViewImage[]): OfferOptionsRequest {
  return views.length > 0 ? { ...options, views } : options;
}
