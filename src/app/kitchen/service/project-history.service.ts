import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { KitchenProjectDetailResponse } from '../model/kitchen-project.model';
import { ProjectEvent } from '../model/project-history.model';

/** Historia projektu: oś czasu zdarzeń i wersje (backend: `/kitchen/projects/{id}/history`). */
@Injectable({ providedIn: 'root' })
export class ProjectHistoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/kitchen/projects`;

  getHistory(projectId: number): Observable<ProjectEvent[]> {
    return this.http.get<ProjectEvent[]>(`${this.baseUrl}/${projectId}/history`);
  }

  /** Projekt w wersji z historii (treść i koszty z chwili zapisu wersji). */
  getVersion(projectId: number, version: number): Observable<KitchenProjectDetailResponse> {
    return this.http.get<KitchenProjectDetailResponse>(`${this.baseUrl}/${projectId}/history/versions/${version}`);
  }
}
