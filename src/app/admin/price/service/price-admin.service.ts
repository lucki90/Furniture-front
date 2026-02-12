import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Page,
  PriceEntryAdminResponse,
  PriceEntryCreateRequest,
  PriceEntryUpdateRequest,
  PriceImportResultResponse,
  ScrapingAllResultResponse,
  ScrapingResultResponse
} from '../model/price-entry.model';

@Injectable({
  providedIn: 'root'
})
export class PriceAdminService {

  private readonly baseUrl = 'http://localhost:8080/api/furniture/api/admin/prices';

  constructor(private readonly http: HttpClient) {}

  /**
   * Pobiera listę cen z paginacją i opcjonalnym filtrowaniem.
   */
  getAll(page: number = 0, size: number = 20, name?: string, activeOnly: boolean = false): Observable<Page<PriceEntryAdminResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('activeOnly', activeOnly.toString());

    if (name) {
      params = params.set('name', name);
    }

    return this.http.get<Page<PriceEntryAdminResponse>>(this.baseUrl, { params });
  }

  /**
   * Pobiera szczegóły pojedynczej pozycji cenowej.
   */
  getById(id: number): Observable<PriceEntryAdminResponse> {
    return this.http.get<PriceEntryAdminResponse>(`${this.baseUrl}/${id}`);
  }

  /**
   * Tworzy nową pozycję cenową.
   */
  create(request: PriceEntryCreateRequest): Observable<PriceEntryAdminResponse> {
    return this.http.post<PriceEntryAdminResponse>(this.baseUrl, request);
  }

  /**
   * Aktualizuje pozycję cenową.
   */
  update(id: number, request: PriceEntryUpdateRequest): Observable<PriceEntryAdminResponse> {
    return this.http.put<PriceEntryAdminResponse>(`${this.baseUrl}/${id}`, request);
  }

  /**
   * Usuwa pozycję cenową (soft delete).
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Importuje ceny z pliku CSV lub Excel.
   */
  importPrices(file: File): Observable<PriceImportResultResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<PriceImportResultResponse>(`${this.baseUrl}/import`, formData);
  }

  /**
   * Uruchamia scraping dla pojedynczej pozycji cenowej.
   */
  scrapeSingle(id: number): Observable<ScrapingResultResponse> {
    return this.http.post<ScrapingResultResponse>(`${this.baseUrl}/${id}/scrape`, {});
  }

  /**
   * Uruchamia scraping dla wszystkich pozycji cenowych z ustawionym URL.
   */
  scrapeAll(): Observable<ScrapingAllResultResponse> {
    return this.http.post<ScrapingAllResultResponse>(`${this.baseUrl}/scrape-all`, {});
  }
}
