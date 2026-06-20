import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { PricingBreakdown, OfferOptionsRequest } from './project-pricing.service';
import { KitchenProjectPricingFacade, PricingFormState, PricingLoadResult } from './kitchen-project-pricing.facade';
import { KitchenProjectExportFacade } from './kitchen-project-export.facade';
import { KitchenStateService } from './kitchen-state.service';
import { ToastService } from '../../core/error/toast.service';
import { OfferOptionsDialogComponent } from '../offer-options-dialog/offer-options-dialog.component';
import { buildPricingViewStateFromResult } from '../kitchen-page-view-state';

const DEFAULT_OFFER_OPTIONS: OfferOptionsRequest = {
  showCostDetails: true,
  frontDescription: '',
  countertopDescription: '',
  hardwareDescription: 'Blum'
};

/**
 * Zarządza stanem wyceny projektu: sygnały UI, ładowanie/zapis przez API,
 * pobieranie PDF oferty z dialogiem opcji.
 * Wydzielony z KitchenPageComponent (FE-36).
 */
@Injectable()
export class KitchenPagePricingService {
  private stateService = inject(KitchenStateService);
  private pricingFacade = inject(KitchenProjectPricingFacade);
  private exportFacade = inject(KitchenProjectExportFacade);
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

  private lastOfferOptions: OfferOptionsRequest = { ...DEFAULT_OFFER_OPTIONS };
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
    ).subscribe(options => {
      if (!options) return;
      this.lastOfferOptions = options;
      this.isPdfDownloading.set(true);
      this.exportFacade.downloadOfferPdf({ projectId: id, options }).pipe(
        takeUntil(this.cancelPdfRequest$),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isPdfDownloading.set(false))
      ).subscribe({ next: () => {}, error: () => {} });
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
