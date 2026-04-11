import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateKitchenProjectRequest,
  KitchenProjectDetailResponse,
  KitchenProjectListResponse,
  KitchenProjectRequest,
  KitchenProjectResponse,
  MultiWallCalculateRequest,
  MultiWallCalculateResponse,
  ProjectStatus,
  UpdateKitchenProjectRequest
} from '../model/kitchen-project.model';
import { CabinetResponse } from '../cabinet-form/model/kitchen-cabinet-form.model';

@Injectable({
  providedIn: 'root'
})
export class KitchenService {

  private readonly baseUrl = `${environment.apiUrl}/kitchen`;
  private readonly addKitchenCabinet = `${this.baseUrl}/add`;
  private readonly kitchenLayout = `${this.baseUrl}/layout`;
  private readonly projectCalculate = `${this.baseUrl}/project/calculate`;
  private readonly projectCalculateAll = `${this.baseUrl}/project/calculate-all`;
  private readonly projectsUrl = `${this.baseUrl}/projects`;

  constructor(private readonly http: HttpClient) {
  }

  calculateCabinet(data: unknown): Observable<CabinetResponse> {
    return this.http.post<CabinetResponse>(this.addKitchenCabinet, data);
  }

  /** @deprecated Not used — layout calculated client-side */
  postKitchenLayout(data: unknown): Observable<unknown> {
    return this.http.post<unknown>(this.kitchenLayout, data);
  }

  /**
   * Kalkuluje cały projekt kuchni - wszystkie szafki na ścianie (legacy - single wall).
   * Waliduje placement i zwraca zagregowane koszty.
   */
  calculateProject(request: KitchenProjectRequest): Observable<KitchenProjectResponse> {
    return this.http.post<KitchenProjectResponse>(this.projectCalculate, request);
  }

  /**
   * Kalkuluje projekt kuchni z wieloma ścianami (bez zapisu do bazy).
   * Waliduje placement na każdej ścianie i zwraca zagregowane koszty.
   */
  calculateMultiWall(request: MultiWallCalculateRequest): Observable<MultiWallCalculateResponse> {
    return this.http.post<MultiWallCalculateResponse>(this.projectCalculateAll, request);
  }

  // ============ PROJECT MANAGEMENT CRUD ============
  // Authorization header added automatically by authInterceptor

  /**
   * Creates a new kitchen project with multiple walls.
   */
  createProject(request: CreateKitchenProjectRequest): Observable<KitchenProjectDetailResponse> {
    return this.http.post<KitchenProjectDetailResponse>(this.projectsUrl, request);
  }

  /**
   * Gets all projects for the current user.
   */
  getProjects(): Observable<KitchenProjectListResponse[]> {
    return this.http.get<KitchenProjectListResponse[]>(this.projectsUrl);
  }

  /**
   * Gets a single project with full details.
   */
  getProjectById(projectId: number): Observable<KitchenProjectDetailResponse> {
    return this.http.get<KitchenProjectDetailResponse>(`${this.projectsUrl}/${projectId}`);
  }

  /**
   * Updates an existing kitchen project.
   */
  updateProject(projectId: number, request: UpdateKitchenProjectRequest): Observable<KitchenProjectDetailResponse> {
    return this.http.put<KitchenProjectDetailResponse>(`${this.projectsUrl}/${projectId}`, request);
  }

  /**
   * Deletes a kitchen project (soft delete).
   */
  deleteProject(projectId: number): Observable<void> {
    return this.http.delete<void>(`${this.projectsUrl}/${projectId}`);
  }

  /**
   * Changes the status of a kitchen project.
   */
  changeProjectStatus(projectId: number, status: ProjectStatus): Observable<KitchenProjectDetailResponse> {
    return this.http.patch<KitchenProjectDetailResponse>(
      `${this.projectsUrl}/${projectId}/status`,
      { status }
    );
  }

}
