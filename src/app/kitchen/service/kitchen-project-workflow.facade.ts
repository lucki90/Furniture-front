import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { KitchenService } from './kitchen.service';
import { ProjectDetailsAggregatorService, AggregationResult } from './project-details-aggregator.service';
import {
  CreateKitchenProjectRequest,
  KitchenProjectDetailResponse,
  MultiWallCalculateRequest,
  MultiWallCalculateResponse,
  ProjectStatus,
  UpdateKitchenProjectRequest
} from '../model/kitchen-project.model';
import { SaveProjectDialogResult } from '../save-project-dialog/save-project-dialog.component';
import { WallWithCabinets } from '../model/kitchen-state.model';

export interface KitchenProjectSaveRequestBuilders {
  buildCreateRequest(dialogResult: SaveProjectDialogResult): CreateKitchenProjectRequest;
  buildUpdateRequest(dialogResult: SaveProjectDialogResult): UpdateKitchenProjectRequest;
}

export interface KitchenProjectInfo {
  id: number;
  name: string;
  version: number;
  description?: string;
  status: ProjectStatus;
  allowedTransitions?: ProjectStatus[];
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
}

export interface KitchenProjectSaveResult {
  response: KitchenProjectDetailResponse;
  projectInfo: KitchenProjectInfo;
  successMessage: string;
}

export interface KitchenProjectCalculationResult {
  response: MultiWallCalculateResponse;
  aggregation: AggregationResult;
  pricingWarnings: string[];
}

@Injectable({ providedIn: 'root' })
export class KitchenProjectWorkflowFacade {
  private kitchenService = inject(KitchenService);
  private aggregatorService = inject(ProjectDetailsAggregatorService);

  saveProject(
    projectId: number | null,
    dialogResult: SaveProjectDialogResult,
    requestBuilders: KitchenProjectSaveRequestBuilders
  ): Observable<KitchenProjectSaveResult> {
    if (projectId != null) {
      return this.kitchenService.updateProject(projectId, requestBuilders.buildUpdateRequest(dialogResult)).pipe(
        map(response => ({
          response,
          projectInfo: mapResponseToProjectInfo(response, dialogResult),
          successMessage: 'Projekt został zaktualizowany'
        }))
      );
    }

    return this.kitchenService.createProject(requestBuilders.buildCreateRequest(dialogResult)).pipe(
      map(response => ({
        response,
        projectInfo: mapResponseToProjectInfo(response, dialogResult),
        successMessage: 'Projekt został zapisany'
      }))
    );
  }

  calculateProject(
    request: MultiWallCalculateRequest,
    frontendWalls: WallWithCabinets[],
    bomTranslations: Record<string, string>
  ): Observable<KitchenProjectCalculationResult> {
    return this.kitchenService.calculateMultiWall(request).pipe(
      map(response => ({
        response,
        aggregation: this.aggregatorService.aggregate(response, frontendWalls, bomTranslations),
        pricingWarnings: collectProjectPricingWarnings(response, this.aggregatorService)
      }))
    );
  }
}

export function mapResponseToProjectInfo(
  response: KitchenProjectDetailResponse,
  dialogResult: SaveProjectDialogResult
): KitchenProjectInfo {
  return {
    id: response.id,
    name: response.name,
    version: response.version,
    description: dialogResult.description,
    status: response.status,
    allowedTransitions: response.allowedTransitions,
    clientName: dialogResult.clientName,
    clientPhone: dialogResult.clientPhone,
    clientEmail: dialogResult.clientEmail
  };
}

export function collectProjectPricingWarnings(
  response: MultiWallCalculateResponse,
  aggregatorService: Pick<ProjectDetailsAggregatorService, 'collectPricingWarnings' | 'collectCornerCountertopPricingWarnings'>
): string[] {
  const wallWarnings = response.walls.flatMap(wall => aggregatorService.collectPricingWarnings(wall));
  const cornerWarnings = aggregatorService.collectCornerCountertopPricingWarnings(response.cornerCountertops);
  return [...new Set([...wallWarnings, ...cornerWarnings])];
}
