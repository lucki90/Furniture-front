import { Injectable, computed, inject } from '@angular/core';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { KitchenWorkspaceStore } from './kitchen-workspace.store';
import { ProjectSettingsService } from './project-settings.service';
import { KitchenGeometryService, KitchenGeometrySettings } from './kitchen-geometry.service';
import { CornerIssue, WallCornerConstraints } from './corner-layout/corner-layout.model';
import { createCornerGeometrySettings } from './corner-layout/corner-reach';
import { buildProjectCornerLayout, ProjectCornerLayout } from './corner-layout/project-corner-layout.builder';

/**
 * Reaktywny układ projektu z narożnikami: strefy narożne ścian dostawionych, przypięcia szafek narożnych i problemy
 * narożników. Jedno źródło ograniczeń narożnych dla elewacji, metryk, rzutu i paneli; request do backendu liczy je
 * tą samą funkcją (`resolveWallCornerConstraints`) z tych samych ustawień.
 */
@Injectable({ providedIn: 'root' })
export class KitchenProjectLayoutService {
  private readonly workspaceStore = inject(KitchenWorkspaceStore);
  private readonly settingsService = inject(ProjectSettingsService);
  private readonly geometryService = inject(KitchenGeometryService);

  readonly cornerSettings = computed(() => createCornerGeometrySettings(
    this.settingsService.fillerWidthMm(),
    this.settingsService.materialDefaults().frontBoardThickness,
    this.settingsService.countertopLyzwaRecessMm()
  ));

  readonly layout = computed((): ProjectCornerLayout => buildProjectCornerLayout(
    this.workspaceStore.walls(),
    wall => this.geometrySettingsFor(wall),
    this.cornerSettings(),
    this.geometryService
  ));

  readonly constraintsByWallId = computed(() => this.layout().constraintsByWallId);
  readonly issues = computed((): readonly CornerIssue[] => this.layout().issues);

  constraintsFor(wallId: string | null | undefined): WallCornerConstraints | undefined {
    return wallId ? this.constraintsByWallId().get(wallId) : undefined;
  }

  geometrySettingsFor(wall: WallWithCabinets): KitchenGeometrySettings {
    return {
      wallType: wall.type,
      wallHeightMm: wall.heightMm,
      plinthHeightMm: this.settingsService.plinthHeightMm(),
      countertopThicknessMm: this.settingsService.countertopThicknessMm(),
      upperFillerHeightMm: this.settingsService.upperFillerHeightMm(),
      fillerWidthMm: this.settingsService.fillerWidthMm()
    };
  }
}
