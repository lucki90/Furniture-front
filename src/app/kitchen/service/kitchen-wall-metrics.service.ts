import { Injectable, computed, inject } from '@angular/core';
import { KitchenWorkspaceStore } from './kitchen-workspace.store';
import { ProjectSettingsService } from './project-settings.service';
import { KitchenGeometryService } from './kitchen-geometry.service';
import { CabinetPosition, KitchenCabinet } from '../model/kitchen-state.model';

/**
 * Reaktywne sygnały metryk wybranej ściany: szerokości, dopasowania i pozycje szafek.
 * Wydzielone z KitchenStateService, żeby fasada pozostała cienka.
 */
@Injectable({
  providedIn: 'root'
})
export class KitchenWallMetricsService {
  private readonly workspaceStore = inject(KitchenWorkspaceStore);
  private readonly settingsService = inject(ProjectSettingsService);
  private readonly geometryService = inject(KitchenGeometryService);

  private readonly selectedWall = computed(() => {
    const wallId = this.workspaceStore.selectedWallId();
    return this.workspaceStore.walls().find(wall => wall.id === wallId) ?? this.workspaceStore.walls()[0];
  });

  private readonly cabinets = computed((): KitchenCabinet[] => this.selectedWall()?.cabinets ?? []);

  readonly usedWidthBottom = computed(() => {
    return this.geometryService.calculateUsedWidth(
      this.cabinets(),
      'BOTTOM',
      this.settingsService.fillerWidthMm(),
      this.selectedWall()?.type
    );
  });

  readonly usedWidthTop = computed(() => {
    return this.geometryService.calculateUsedWidth(
      this.cabinets(),
      'TOP',
      this.settingsService.fillerWidthMm(),
      this.selectedWall()?.type
    );
  });

  readonly totalWidth = computed(() => Math.max(this.usedWidthBottom(), this.usedWidthTop()));

  readonly fitsOnWall = computed(() => {
    const wall = this.selectedWall();
    if (!wall) {
      return true;
    }

    return this.usedWidthBottom() <= wall.widthMm && this.usedWidthTop() <= wall.widthMm;
  });

  readonly remainingWidth = computed(() => {
    const wall = this.selectedWall();
    if (!wall) {
      return 0;
    }

    return Math.min(wall.widthMm - this.usedWidthBottom(), wall.widthMm - this.usedWidthTop());
  });

  readonly remainingWidthBottom = computed(() => {
    const wall = this.selectedWall();
    return wall ? wall.widthMm - this.usedWidthBottom() : 0;
  });

  readonly remainingWidthTop = computed(() => {
    const wall = this.selectedWall();
    return wall ? wall.widthMm - this.usedWidthTop() : 0;
  });

  readonly cabinetPositions = computed((): CabinetPosition[] => {
    return this.geometryService.calculateCabinetPositions(this.cabinets(), {
      wallType: this.selectedWall()?.type,
      wallHeightMm: this.selectedWall()?.heightMm ?? 2600,
      plinthHeightMm: this.settingsService.plinthHeightMm(),
      countertopThicknessMm: this.settingsService.countertopThicknessMm(),
      upperFillerHeightMm: this.settingsService.upperFillerHeightMm(),
      fillerWidthMm: this.settingsService.fillerWidthMm()
    });
  });
}
