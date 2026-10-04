import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjectEvent } from '../model/project-history.model';

/** Historia projektu: oś czasu zdarzeń i wersje (backend: `/kitchen/projects/{id}/history`). */
@Injectable({ providedIn: 'root' })
export class ProjectHistoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/kitchen/projects`;

  getHistory(projectId: number): Observable<ProjectEvent[]> {
    return this.http.get<ProjectEvent[]>(`${this.baseUrl}/${projectId}/history`);
  }
}
