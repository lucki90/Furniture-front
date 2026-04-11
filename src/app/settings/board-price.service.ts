import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BoardPrice {
  id: number;
  materialCode: string;
  materialName: string;
  thicknessMm: number;
  colorCode: string;
  colorName: string | null;
  colorHex: string | null;
  varnished: boolean;
  materialActive: boolean;
  pricePerM2: number | null;
  source: 'OWN' | 'GLOBAL';
  priceEntryId: number;
  updatedAt: string | null;
}

export interface CreateBoardPrice {
  materialCode: string;
  thicknessMm: number;
  colorCode: string;
  colorName?: string;
  colorHex?: string;
  varnished: boolean;
  pricePerM2: number;
}

export interface UpdateBoardPrice {
  pricePerM2: number;
  colorName?: string;
  colorHex?: string;
}

export interface CsvImportResult {
  added: number;
  updated: number;
  errors: { lineNumber: number; line: string; message: string }[];
}

const BASE_URL = `${environment.apiUrl}/prices/boards`;

@Injectable({ providedIn: 'root' })
export class BoardPriceService {

  private http = inject(HttpClient);

  list(): Observable<BoardPrice[]> {
    return this.http.get<BoardPrice[]>(BASE_URL);
  }

  create(request: CreateBoardPrice): Observable<BoardPrice> {
    return this.http.post<BoardPrice>(BASE_URL, request);
  }

  update(id: number, request: UpdateBoardPrice): Observable<BoardPrice> {
    return this.http.put<BoardPrice>(`${BASE_URL}/${id}`, request);
  }

  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${BASE_URL}/template`, { responseType: 'blob' });
  }

  importCsv(file: File): Observable<CsvImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CsvImportResult>(`${BASE_URL}/import`, formData);
  }
}
