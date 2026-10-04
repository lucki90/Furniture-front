import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { KitchenProjectDetailResponse } from '../model/kitchen-project.model';
import { KitchenService } from './kitchen.service';
import { KitchenStateService } from './kitchen-state.service';
import { ProjectHistoryService } from './project-history.service';

/**
 * Wersje projektu z historii: otwarcie wersji w edytorze (zapis ją przywraca), kopia wersji jako nowy projekt
 * i powrót do bieżącej wersji.
 */
@Injectable({ providedIn: 'root' })
export class KitchenProjectVersionsFacade {
  private readonly historyService = inject(ProjectHistoryService);
  private readonly kitchenService = inject(KitchenService);
  private readonly stateService = inject(KitchenStateService);

  openVersion(projectId: number, version: number): Observable<KitchenProjectDetailResponse> {
    return this.historyService.getVersion(projectId, version).pipe(
      tap(project => this.stateService.openProjectVersion(project))
    );
  }

  cloneVersion(projectId: number, version: number): Observable<KitchenProjectDetailResponse> {
    return this.kitchenService.cloneProject(projectId, undefined, version).pipe(
      tap(project => this.stateService.loadProject(project))
    );
  }

  returnToCurrent(projectId: number): Observable<KitchenProjectDetailResponse> {
    return this.kitchenService.getProjectById(projectId).pipe(
      tap(project => this.stateService.loadProject(project))
    );
  }
}
