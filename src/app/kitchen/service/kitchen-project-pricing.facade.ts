import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  OfferOptionsRequest,
  PricingBreakdown,
  ProjectPricingService,
  UpdatePricingRequest
} from './project-pricing.service';

export interface PricingFormState {
  discountPct: number;
  manualOverrideEnabled: boolean;
  manualOverride: number | null;
  offerNotes: string;
}

export interface PricingLoadResult {
  breakdown: PricingBreakdown;
  formState: PricingFormState;
}

export interface OfferPdfDownload {
  blob: Blob | null;
  filename: string;
}

@Injectable({ providedIn: 'root' })
export class KitchenProjectPricingFacade {
  private pricingService = inject(ProjectPricingService);

  loadPricing(projectId: number): Observable<PricingLoadResult> {
    return this.pricingService.getBreakdown(projectId).pipe(
      map(breakdown => ({
        breakdown,
        formState: mapPricingBreakdownToFormState(breakdown)
      }))
    );
  }

  savePricing(projectId: number, formState: PricingFormState): Observable<PricingLoadResult> {
    return this.pricingService.updatePricing(projectId, buildPricingUpdateRequest(formState)).pipe(
      map(breakdown => ({
        breakdown,
        formState: mapPricingBreakdownToFormState(breakdown)
      }))
    );
  }

  downloadOfferPdf(projectId: number, options: OfferOptionsRequest): Observable<OfferPdfDownload> {
    return this.pricingService.downloadOfferPdf(projectId, options).pipe(
      map(response => ({
        blob: response.body,
        filename: extractOfferPdfFilename(response.headers.get('Content-Disposition'))
      }))
    );
  }
}

export function mapPricingBreakdownToFormState(breakdown: PricingBreakdown): PricingFormState {
  return {
    discountPct: breakdown.discountPct ?? 0,
    manualOverrideEnabled: breakdown.manualPriceOverride != null,
    manualOverride: breakdown.manualPriceOverride ?? null,
    offerNotes: breakdown.offerNotes ?? ''
  };
}

export function buildPricingUpdateRequest(formState: PricingFormState): UpdatePricingRequest {
  return {
    discountPct: formState.discountPct,
    manualPriceOverride: formState.manualOverrideEnabled ? formState.manualOverride : null,
    offerNotes: formState.offerNotes || null
  };
}

export function extractOfferPdfFilename(contentDisposition: string | null | undefined): string {
  if (!contentDisposition) {
    return 'oferta.pdf';
  }

  const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
  return match?.[1] || 'oferta.pdf';
}
