import { Injectable, inject } from '@angular/core';
import { ProjectRequestBuilderService } from './project-request-builder.service';
import { ProjectSettingsService } from './project-settings.service';
import { ProjectMetadataService } from './project-metadata.service';
import { KitchenWorkspaceStore } from './kitchen-workspace.store';
import {
  CreateKitchenProjectRequest,
  MultiWallCalculateRequest,
  ProjectWallRequest,
  UpdateKitchenProjectRequest
} from '../model/kitchen-project.model';

/**
 * Fasada budowania requestów HTTP dla aktywnego projektu kuchennego.
 * Łączy stan workspace (ściany, szafki), ustawienia projektu i metadane
 * w gotowe obiekty requestów do API kalkulacji i persystencji.
 */
@Injectable({ providedIn: 'root' })
export class KitchenProjectRequestsFacade {
  private readonly requestBuilder = inject(ProjectRequestBuilderService);
  private readonly settingsService = inject(ProjectSettingsService);
  private readonly metadataService = inject(ProjectMetadataService);
  private readonly workspaceStore = inject(KitchenWorkspaceStore);

  buildProjectWalls(): ProjectWallRequest[] {
    return this.requestBuilder.buildProjectWalls(this.workspaceStore.walls(), {
      plinthHeightMm: this.settingsService.plinthHeightMm(),
      countertopThicknessMm: this.settingsService.countertopThicknessMm(),
      upperFillerHeightMm: this.settingsService.upperFillerHeightMm(),
      fillerWidthMm: this.settingsService.fillerWidthMm(),
      materialDefaults: this.settingsService.materialDefaults()
    });
  }

  buildMultiWallCalculateRequest(): MultiWallCalculateRequest {
    const connections = this.requestBuilder.buildConnections(this.workspaceStore.walls());
    return {
      walls: this.buildProjectWalls(),
      connections: connections.length > 0 ? connections : undefined,
      roomWidthMm: this.metadataService.currentProjectRoomWidthMm() ?? undefined,
      roomDepthMm: this.metadataService.currentProjectRoomDepthMm() ?? undefined
    };
  }

  buildMultiWallProjectRequest(
    name: string,
    description?: string,
    clientName?: string,
    clientPhone?: string,
    clientEmail?: string
  ): CreateKitchenProjectRequest {
    return {
      name,
      description,
      clientName,
      clientPhone,
      clientEmail,
      walls: this.buildProjectWalls(),
      plinthHeightMm: this.settingsService.plinthHeightMm(),
      countertopThicknessMm: this.settingsService.countertopThicknessMm(),
      upperFillerHeightMm: this.settingsService.upperFillerHeightMm(),
      roomWidthMm: this.metadataService.currentProjectRoomWidthMm() ?? undefined,
      roomDepthMm: this.metadataService.currentProjectRoomDepthMm() ?? undefined
    };
  }

  buildUpdateProjectRequest(
    name?: string,
    description?: string,
    clientName?: string,
    clientPhone?: string,
    clientEmail?: string
  ): UpdateKitchenProjectRequest {
    return {
      name: name ?? this.metadataService.currentProjectName() ?? 'Bez nazwy',
      description,
      clientName,
      clientPhone,
      clientEmail,
      walls: this.buildProjectWalls(),
      plinthHeightMm: this.settingsService.plinthHeightMm(),
      countertopThicknessMm: this.settingsService.countertopThicknessMm(),
      upperFillerHeightMm: this.settingsService.upperFillerHeightMm(),
      // Wysyłamy jawnie `null` (a nie `undefined`), żeby PUT /projects/{id}
      // mógł wyczyścić wcześniej zapisane wymiary pomieszczenia.
      roomWidthMm: this.metadataService.currentProjectRoomWidthMm(),
      roomDepthMm: this.metadataService.currentProjectRoomDepthMm()
    };
  }
}
