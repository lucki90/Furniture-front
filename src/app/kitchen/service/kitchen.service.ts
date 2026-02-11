import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Observable} from 'rxjs';
import {
  CreateKitchenProjectRequest,
  KitchenProjectDetailResponse,
  KitchenProjectListResponse,
  KitchenProjectRequest,
  KitchenProjectResponse,
  UpdateKitchenProjectRequest
} from '../model/kitchen-project.model';

@Injectable({
  providedIn: 'root'
})
export class KitchenService {

  private readonly baseUrl = 'http://localhost:8080/api/furniture/kitchen';
  private readonly addKitchenCabinet = `${this.baseUrl}/add`;
  private readonly kitchenLayout = `${this.baseUrl}/layout`;
  private readonly projectCalculate = `${this.baseUrl}/project/calculate`;
  private readonly projectsUrl = `${this.baseUrl}/projects`;

  constructor(private readonly http: HttpClient) {
  }

  calculateCabinet(data: any): Observable<any> {
    return this.http.post<any>(this.addKitchenCabinet, data);
  }

  postKitchenLayout(data: any): Observable<any> {
    return this.http.post<any>(this.kitchenLayout, data);
  }

  /**
   * Kalkuluje cały projekt kuchni - wszystkie szafki na ścianie.
   * Waliduje placement i zwraca zagregowane koszty.
   */
  calculateProject(request: KitchenProjectRequest): Observable<KitchenProjectResponse> {
    return this.http.post<KitchenProjectResponse>(this.projectCalculate, request);
  }

  // ============ PROJECT MANAGEMENT CRUD ============

  private getUserHeaders(userId: number = 1): HttpHeaders {
    return new HttpHeaders().set('X-User-Id', userId.toString());
  }

  /**
   * Creates a new kitchen project with multiple walls.
   */
  createProject(request: CreateKitchenProjectRequest, userId: number = 1): Observable<KitchenProjectDetailResponse> {
    return this.http.post<KitchenProjectDetailResponse>(
      this.projectsUrl,
      request,
      { headers: this.getUserHeaders(userId) }
    );
  }

  /**
   * Gets all projects for the current user.
   */
  getProjects(userId: number = 1): Observable<KitchenProjectListResponse[]> {
    return this.http.get<KitchenProjectListResponse[]>(
      this.projectsUrl,
      { headers: this.getUserHeaders(userId) }
    );
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
  updateProject(projectId: number, request: UpdateKitchenProjectRequest, userId: number = 1): Observable<KitchenProjectDetailResponse> {
    return this.http.put<KitchenProjectDetailResponse>(
      `${this.projectsUrl}/${projectId}`,
      request,
      { headers: this.getUserHeaders(userId) }
    );
  }

  /**
   * Deletes a kitchen project (soft delete).
   */
  deleteProject(projectId: number, userId: number = 1): Observable<void> {
    return this.http.delete<void>(
      `${this.projectsUrl}/${projectId}`,
      { headers: this.getUserHeaders(userId) }
    );
  }

}
