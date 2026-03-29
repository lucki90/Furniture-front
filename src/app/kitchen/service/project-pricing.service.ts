import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

const BASE_URL = 'http://localhost:8080/api/furniture/kitchen/projects';

@Injectable({ providedIn: 'root' })
export class ProjectPricingService {

  private http = inject(HttpClient);

  getBreakdown(projectId: number): Observable<PricingBreakdown> {
    return this.http.get<PricingBreakdown>(`${BASE_URL}/${projectId}/pricing`);
  }

  updatePricing(projectId: number, request: UpdatePricingRequest): Observable<PricingBreakdown> {
    return this.http.put<PricingBreakdown>(`${BASE_URL}/${projectId}/pricing`, request);
  }
}
