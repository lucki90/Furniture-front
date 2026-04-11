import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface JobPrice {
  id: number;
  jobId: number;
  jobCode: string;
  jobName: string;
  jobCategory: string;
  variantCode: string;
  unit: string | null;
  thicknessThresholdMm: number | null;
  pricePerUnit: number | null;
  jobActive: boolean;
  variantActive: boolean;
  priceEntryId: number;
  updatedAt: string | null;
}

export interface UpdateJobPrice {
  pricePerUnit: number;
}

const BASE_URL = `${environment.apiUrl}/prices/jobs`;

@Injectable({ providedIn: 'root' })
export class JobPriceService {

  private http = inject(HttpClient);

  list(): Observable<JobPrice[]> {
    return this.http.get<JobPrice[]>(BASE_URL);
  }

  update(id: number, request: UpdateJobPrice): Observable<JobPrice> {
    return this.http.put<JobPrice>(`${BASE_URL}/${id}`, request);
  }
}
