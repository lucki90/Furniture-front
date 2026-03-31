import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ComponentPrice {
  id: number;
  componentId: number;
  componentCode: string;
  componentName: string;
  category: string;
  modelCode: string;
  additionalInfo: string | null;
  unit: string | null;
  pricePerUnit: number | null;
  componentActive: boolean;
  variantActive: boolean;
  priceEntryId: number;
  updatedAt: string | null;
}

export interface UpdateComponentPrice {
  pricePerUnit: number;
}

const BASE_URL = 'http://localhost:8080/api/furniture/prices/components';

@Injectable({ providedIn: 'root' })
export class ComponentPriceService {

  private http = inject(HttpClient);

  list(): Observable<ComponentPrice[]> {
    return this.http.get<ComponentPrice[]>(BASE_URL);
  }

  update(id: number, request: UpdateComponentPrice): Observable<ComponentPrice> {
    return this.http.put<ComponentPrice>(`${BASE_URL}/${id}`, request);
  }
}
