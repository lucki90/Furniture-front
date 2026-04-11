import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PricingBreakdown {
  boardsNet: number;
  markupMaterialsPct: number;
  boardsMarkupAmount: number;
  boardsTotal: number;

  componentsNet: number;
  markupComponentsPct: number;
  componentsMarkupAmount: number;
  componentsTotal: number;

  jobsNet: number;
  markupJobsPct: number;
  jobsMarkupAmount: number;
  jobsTotal: number;

  subtotal: number;

  discountPct: number;
  discountAmount: number;
  afterDiscount: number;

  manualPriceOverride: number | null;
  finalPrice: number;

  offerNotes: string | null;
}

export interface UpdatePricingRequest {
  discountPct: number;
  manualPriceOverride: number | null;
  offerNotes: string | null;
}

export interface OfferOptionsRequest {
  showCostDetails: boolean;
  frontDescription?: string;
  countertopDescription?: string;
  hardwareDescription?: string;
}

const BASE_URL = `${environment.apiUrl}/kitchen/projects`;

@Injectable({ providedIn: 'root' })
export class ProjectPricingService {

  private http = inject(HttpClient);

  getBreakdown(projectId: number): Observable<PricingBreakdown> {
    return this.http.get<PricingBreakdown>(`${BASE_URL}/${projectId}/pricing`);
  }

  updatePricing(projectId: number, request: UpdatePricingRequest): Observable<PricingBreakdown> {
    return this.http.put<PricingBreakdown>(`${BASE_URL}/${projectId}/pricing`, request);
  }

  downloadOfferPdf(projectId: number, options: OfferOptionsRequest): Observable<HttpResponse<Blob>> {
    return this.http.post(`${BASE_URL}/${projectId}/offer/pdf`, options, {
      responseType: 'blob',
      observe: 'response'
    });
  }
}
