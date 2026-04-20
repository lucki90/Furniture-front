import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { KitchenService } from './kitchen.service';
import { KitchenProjectInfo, mapResponseToProjectInfo } from './kitchen-project-workflow.facade';
import { ProjectStatus, getStatusLabel } from '../model/kitchen-project.model';

export interface KitchenProjectStatusChangeResult {
  projectInfo: KitchenProjectInfo;
  successMessage: string;
}

@Injectable({ providedIn: 'root' })
export class KitchenProjectStatusFacade {
  private kitchenService = inject(KitchenService);

  changeStatus(projectId: number, status: ProjectStatus): Observable<KitchenProjectStatusChangeResult> {
    return this.kitchenService.changeProjectStatus(projectId, status).pipe(
      map(response => ({
        projectInfo: mapResponseToProjectInfo(response, {
          name: response.name,
          description: response.description,
          clientName: response.clientName,
          clientPhone: response.clientPhone,
          clientEmail: response.clientEmail
        }),
        successMessage: `Status zmieniony na: ${getStatusLabel(response.status)}`
      }))
    );
  }
}
