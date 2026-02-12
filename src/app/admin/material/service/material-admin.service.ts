import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Page,
  BoardVariantAdminResponse,
  BoardVariantCreateRequest,
  BoardVariantUpdateRequest,
  ComponentVariantAdminResponse,
  ComponentVariantCreateRequest,
  ComponentVariantUpdateRequest,
  JobVariantAdminResponse,
  JobVariantCreateRequest,
  JobVariantUpdateRequest,
  MaterialOption,
  ComponentOption,
  JobOption,
  BulkPriceUpdateRequest,
  BulkPriceUpdateResponse
} from '../model/material-variant.model';

@Injectable({
  providedIn: 'root'
})
export class MaterialAdminService {

  private readonly baseUrl = 'http://localhost:8080/api/furniture/api/admin/materials';

  constructor(private readonly http: HttpClient) {}

  // ============ OPTIONS ============

  getMaterialOptions(): Observable<MaterialOption[]> {
    return this.http.get<MaterialOption[]>(`${this.baseUrl}/options/materials`);
  }

  getComponentOptions(): Observable<ComponentOption[]> {
    return this.http.get<ComponentOption[]>(`${this.baseUrl}/options/components`);
  }

  getJobOptions(): Observable<JobOption[]> {
    return this.http.get<JobOption[]>(`${this.baseUrl}/options/jobs`);
  }

  // ============ BOARD VARIANTS ============

  getBoardVariants(page: number = 0, size: number = 20, materialCode?: string, activeOnly: boolean = false): Observable<Page<BoardVariantAdminResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('activeOnly', activeOnly.toString());

    if (materialCode) {
      params = params.set('materialCode', materialCode);
    }

    return this.http.get<Page<BoardVariantAdminResponse>>(`${this.baseUrl}/board-variants`, { params });
  }

  getBoardVariant(id: number): Observable<BoardVariantAdminResponse> {
    return this.http.get<BoardVariantAdminResponse>(`${this.baseUrl}/board-variants/${id}`);
  }

  createBoardVariant(request: BoardVariantCreateRequest): Observable<BoardVariantAdminResponse> {
    return this.http.post<BoardVariantAdminResponse>(`${this.baseUrl}/board-variants`, request);
  }

  updateBoardVariant(id: number, request: BoardVariantUpdateRequest): Observable<BoardVariantAdminResponse> {
    return this.http.put<BoardVariantAdminResponse>(`${this.baseUrl}/board-variants/${id}`, request);
  }

  deleteBoardVariant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/board-variants/${id}`);
  }

  // ============ COMPONENT VARIANTS ============

  getComponentVariants(page: number = 0, size: number = 20, search?: string, activeOnly: boolean = false): Observable<Page<ComponentVariantAdminResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('activeOnly', activeOnly.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<Page<ComponentVariantAdminResponse>>(`${this.baseUrl}/component-variants`, { params });
  }

  getComponentVariant(id: number): Observable<ComponentVariantAdminResponse> {
    return this.http.get<ComponentVariantAdminResponse>(`${this.baseUrl}/component-variants/${id}`);
  }

  createComponentVariant(request: ComponentVariantCreateRequest): Observable<ComponentVariantAdminResponse> {
    return this.http.post<ComponentVariantAdminResponse>(`${this.baseUrl}/component-variants`, request);
  }

  updateComponentVariant(id: number, request: ComponentVariantUpdateRequest): Observable<ComponentVariantAdminResponse> {
    return this.http.put<ComponentVariantAdminResponse>(`${this.baseUrl}/component-variants/${id}`, request);
  }

  deleteComponentVariant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/component-variants/${id}`);
  }

  // ============ JOB VARIANTS ============

  getJobVariants(page: number = 0, size: number = 20, search?: string, activeOnly: boolean = false): Observable<Page<JobVariantAdminResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('activeOnly', activeOnly.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<Page<JobVariantAdminResponse>>(`${this.baseUrl}/job-variants`, { params });
  }

  getJobVariant(id: number): Observable<JobVariantAdminResponse> {
    return this.http.get<JobVariantAdminResponse>(`${this.baseUrl}/job-variants/${id}`);
  }

  createJobVariant(request: JobVariantCreateRequest): Observable<JobVariantAdminResponse> {
    return this.http.post<JobVariantAdminResponse>(`${this.baseUrl}/job-variants`, request);
  }

  updateJobVariant(id: number, request: JobVariantUpdateRequest): Observable<JobVariantAdminResponse> {
    return this.http.put<JobVariantAdminResponse>(`${this.baseUrl}/job-variants/${id}`, request);
  }

  deleteJobVariant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/job-variants/${id}`);
  }

  // ============ BULK OPERATIONS ============

  bulkPriceUpdate(request: BulkPriceUpdateRequest): Observable<BulkPriceUpdateResponse> {
    return this.http.post<BulkPriceUpdateResponse>(`${this.baseUrl}/bulk-price-update`, request);
  }
}
