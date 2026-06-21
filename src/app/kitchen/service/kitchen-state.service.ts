import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { KitchenProjectRequestsFacade } from './kitchen-project-requests.facade';
import { ProjectSettingsService } from './project-settings.service';
import { ProjectMetadataService } from './project-metadata.service';
import { KitchenWallMetricsService } from './kitchen-wall-metrics.service';
import { KitchenProjectStateMapper } from './kitchen-project-state.mapper';
import { KitchenWorkspaceStore } from './kitchen-workspace.store';
import {
  CabinetFormData,
  CountertopConfig,
  KitchenCabinet,
  KitchenWallConfig,
  PlinthConfig,
  isFreestandingAppliance
} from '../model/kitchen-state.model';
import {
  CabinetSide,
  IslandAdjacentSide,
  KitchenProjectDetailResponse,
  ProjectStatus,
  WALL_TYPES,
  WallType
} from '../model/kitchen-project.model';
import { CabinetResponse } from '../cabinet-form/model/kitchen-cabinet-form.model';

@Injectable({
  providedIn: 'root'
})
export class KitchenStateService {
  private settingsService = inject(ProjectSettingsService);
  private metadataService = inject(ProjectMetadataService);
  private wallMetrics = inject(KitchenWallMetricsService);
  private projectStateMapper = inject(KitchenProjectStateMapper);
  private workspaceStore = inject(KitchenWorkspaceStore);
  private requestsFacade = inject(KitchenProjectRequestsFacade);

  readonly walls = this.workspaceStore.walls;
  readonly selectedWallId = this.workspaceStore.selectedWallId;

  /** Aktywna strona wyspy widoczna w widoku frontalnym. Resetowana do FRONT gdy wybrana ściana nie jest wyspą. */
  readonly visibleIslandSide = signal<CabinetSide>('FRONT');

  constructor() {
    effect(() => {
      // Gdy użytkownik przełącza się na ścianę inną niż ISLAND, resetuj widok do FRONT.
      if (this.selectedWall()?.type !== 'ISLAND') {
        this.visibleIslandSide.set('FRONT');
      }
    });
  }

  readonly currentProjectId = this.metadataService.currentProjectId;
  readonly currentProjectName = this.metadataService.currentProjectName;
  readonly currentProjectDescription = this.metadataService.currentProjectDescription;
  readonly currentProjectClientName = this.metadataService.currentProjectClientName;
  readonly currentProjectClientPhone = this.metadataService.currentProjectClientPhone;
  readonly currentProjectClientEmail = this.metadataService.currentProjectClientEmail;
  readonly currentProjectVersion = this.metadataService.currentProjectVersion;
  readonly currentProjectStatus = this.metadataService.currentProjectStatus;
  readonly currentProjectAllowedTransitions = this.metadataService.currentProjectAllowedTransitions;
  readonly currentProjectRoomWidthMm = this.metadataService.currentProjectRoomWidthMm;
  readonly currentProjectRoomDepthMm = this.metadataService.currentProjectRoomDepthMm;

  readonly plinthHeightMm = this.settingsService.plinthHeightMm;
  readonly countertopThicknessMm = this.settingsService.countertopThicknessMm;
  readonly upperFillerHeightMm = this.settingsService.upperFillerHeightMm;
  readonly distanceFromWallMm = this.settingsService.distanceFromWallMm;
  readonly plinthSetbackMm = this.settingsService.plinthSetbackMm;
  readonly fillerWidthMm = this.settingsService.fillerWidthMm;
  readonly frontGapMm = this.settingsService.frontGapMm;
  readonly supportHeightReductionMm = this.settingsService.supportHeightReductionMm;
  readonly supportWidthReductionMm = this.settingsService.supportWidthReductionMm;
  readonly materialDefaults = this.settingsService.materialDefaults;
  readonly countertopSurfaceHeightMm = this.settingsService.countertopSurfaceHeightMm;
  readonly showCountertop = this.settingsService.showCountertop;
  readonly showUpperCabinets = this.settingsService.showUpperCabinets;
  private _cleanWorkspaceSignature = signal(this.buildPersistedWorkspaceSignature());

  readonly selectedWall = computed(() => {
    const wallId = this.selectedWallId();
    return this.walls().find(wall => wall.id === wallId) ?? this.walls()[0];
  });

  readonly wall = computed((): KitchenWallConfig => {
    const selected = this.selectedWall();
    return {
      length: selected?.widthMm ?? 3600,
      height: selected?.heightMm ?? 2600
    };
  });

  readonly cabinets = computed((): KitchenCabinet[] => this.selectedWall()?.cabinets ?? []);

  readonly totalCost = computed(() => {
    return this.walls().reduce((wallSum, wall) => {
      return wallSum + wall.cabinets.reduce((cabinetSum, cabinet) => {
        return cabinetSum + (cabinet.calculatedResult?.totalCost ?? 0);
      }, 0);
    }, 0);
  });

  readonly selectedWallTotalCost = computed(() => {
    return this.cabinets().reduce((sum, cabinet) => sum + (cabinet.calculatedResult?.totalCost ?? 0), 0);
  });

  readonly usedWidthBottom = this.wallMetrics.usedWidthBottom;
  readonly usedWidthTop = this.wallMetrics.usedWidthTop;
  readonly totalWidth = this.wallMetrics.totalWidth;
  readonly fitsOnWall = this.wallMetrics.fitsOnWall;
  readonly remainingWidth = this.wallMetrics.remainingWidth;
  readonly remainingWidthBottom = this.wallMetrics.remainingWidthBottom;
  readonly remainingWidthTop = this.wallMetrics.remainingWidthTop;
  readonly cabinetPositions = this.wallMetrics.cabinetPositions;

  readonly totalCabinetCount = computed(() => {
    return this.walls().reduce((sum, wall) => sum + wall.cabinets.length, 0);
  });

  readonly hasUnsavedChanges = computed(() => {
    return this.buildPersistedWorkspaceSignature() !== this._cleanWorkspaceSignature();
  });

  readonly canUndo = this.workspaceStore.canUndo;
  readonly canRedo = this.workspaceStore.canRedo;

  undo(): boolean {
    return this.workspaceStore.undo();
  }

  redo(): boolean {
    return this.workspaceStore.redo();
  }

  addWall(type: WallType, widthMm: number, heightMm: number, islandDepthMm?: number, adjacentToWall?: IslandAdjacentSide): string {
    return this.workspaceStore.addWall(
      type,
      widthMm,
      heightMm,
      this.settingsService.getGlobalDefaultCountertopThicknessMm(),
      this.settingsService.plinthHeightMm(),
      { islandDepthMm, adjacentToWall }
    );
  }

  removeWall(wallId: string): void {
    this.workspaceStore.removeWall(wallId);
  }

  selectWall(wallId: string): void {
    this.workspaceStore.selectWall(wallId);
  }

  updateWallDimensions(wallId: string, widthMm: number, heightMm: number): void {
    this.workspaceStore.updateWallDimensions(wallId, widthMm, heightMm);
  }

  updateWallState(wallId: string, patch: Partial<import('../model/kitchen-state.model').WallWithCabinets>): void {
    this.workspaceStore.updateWall(wallId, patch);
  }

  /**
   * recordHistory wlaczaj tylko dla mutacji wykonywanych z poziomu edytora projektu.
   * Globalny ekran /settings ma osobny lifecycle i obecnie nie uczestniczy w workspace undo/redo.
   */
  updateRoomDimensions(
    roomWidthMm?: number | null,
    roomDepthMm?: number | null,
    options?: { recordHistory?: boolean }
  ): void {
    if (options?.recordHistory) {
      this.workspaceStore.recordHistorySnapshot();
    }
    this.metadataService.updateRoomDimensions(roomWidthMm, roomDepthMm);
  }

  getWallLabel(type: WallType): string {
    return WALL_TYPES.find(wallType => wallType.value === type)?.label ?? type;
  }

  isWallTypeUsed(type: WallType): boolean {
    if (type === 'MAIN' || type === 'LEFT' || type === 'RIGHT') {
      return this.walls().some(wall => wall.type === type);
    }

    return false;
  }

  getAvailableWallTypes(): { value: WallType; label: string }[] {
    return WALL_TYPES.filter(wallType => !this.isWallTypeUsed(wallType.value));
  }

  /**
   * recordHistory wlaczaj tylko dla mutacji wykonywanych z poziomu edytora projektu.
   * Globalny ekran /settings ma osobny lifecycle i obecnie nie uczestniczy w workspace undo/redo.
   */
  updateProjectSettings(
    settings: Parameters<ProjectSettingsService['updateProjectSettings']>[0],
    options?: { recordHistory?: boolean }
  ): void {
    if (options?.recordHistory) {
      this.workspaceStore.recordHistorySnapshot();
    }
    this.settingsService.updateProjectSettings(settings);
  }

  setGlobalDefaults(settings: Parameters<ProjectSettingsService['setGlobalDefaults']>[0]): void {
    this.settingsService.setGlobalDefaults(settings);
  }

  getGlobalDefaultPlinthHeightMm(): number {
    return this.settingsService.getGlobalDefaultPlinthHeightMm();
  }

  setMaterialDefaults(settings: Parameters<ProjectSettingsService['setMaterialDefaults']>[0]): void {
    this.settingsService.setMaterialDefaults(settings);
  }

  updateCountertopConfig(wallId: string, config: CountertopConfig): void {
    this.workspaceStore.updateCountertopConfig(wallId, config);
  }

  updatePlinthConfig(wallId: string, config: PlinthConfig): void {
    this.workspaceStore.updatePlinthConfig(wallId, config);
  }

  getCountertopConfig(wallId: string): CountertopConfig | undefined {
    return this.workspaceStore.getCountertopConfig(wallId);
  }

  getPlinthConfig(wallId: string): PlinthConfig | undefined {
    return this.workspaceStore.getPlinthConfig(wallId);
  }

  addCabinet(formData: CabinetFormData, calculatedResult: CabinetResponse): void {
    this.workspaceStore.addCabinetToSelectedWall(formData, calculatedResult);
  }

  removeCabinet(cabinetId: string): void {
    this.workspaceStore.removeCabinet(cabinetId);
  }

  cloneCabinet(cabinetId: string): void {
    this.workspaceStore.cloneCabinet(cabinetId);
  }

  getCabinetById(cabinetId: string): KitchenCabinet | undefined {
    for (const wall of this.walls()) {
      const cabinet = wall.cabinets.find(item => item.id === cabinetId);
      if (cabinet) {
        return cabinet;
      }
    }

    return undefined;
  }

  updateCabinet(cabinetId: string, formData: CabinetFormData, calculatedResult: CabinetResponse): void {
    this.workspaceStore.updateCabinet(cabinetId, formData, calculatedResult);
  }

  updateWall(config: Partial<KitchenWallConfig>): void {
    const wall = this.selectedWall();
    if (!wall) {
      return;
    }

    this.workspaceStore.updateWallDimensions(wall.id, config.length ?? wall.widthMm, config.height ?? wall.heightMm);
  }

  clearAll(): void {
    this.workspaceStore.resetWorkspace(
      this.settingsService.getGlobalDefaultCountertopThicknessMm(),
      this.settingsService.getGlobalDefaultPlinthHeightMm()
    );
    this.metadataService.clearMetadata();
    this.settingsService.resetToGlobalDefaults();
  }

  startNewProject(): void {
    this.clearAll();
    this.markProjectAsClean();
  }

  loadProject(project: KitchenProjectDetailResponse): void {
    const mappedState = this.projectStateMapper.mapProject(project, {
      fillerWidthMm: this.settingsService.fillerWidthMm()
    });
    this.workspaceStore.applyLoadedProject(mappedState.walls, mappedState.wallIdCounter, mappedState.cabinetIdCounter);
    this.metadataService.applyLoadedProject(project);

    this.settingsService.applyProjectSettings(
      project.plinthHeightMm ?? 100,
      project.countertopThicknessMm ?? 38,
      project.upperFillerHeightMm ?? 100
    );
    this.markProjectAsClean();
  }

  setProjectInfo(
    projectId: number,
    projectName: string,
    version: number,
    description?: string,
    status?: ProjectStatus,
    allowedTransitions?: ProjectStatus[],
    clientName?: string,
    clientPhone?: string,
    clientEmail?: string,
    roomWidthMm?: number,
    roomDepthMm?: number
  ): void {
    this.metadataService.setProjectInfo(
      projectId,
      projectName,
      version,
      description,
      status,
      allowedTransitions,
      clientName,
      clientPhone,
      clientEmail,
      roomWidthMm,
      roomDepthMm
    );
  }

  hasUnsavedProject(): boolean {
    return this.metadataService.currentProjectId() === null && this.totalCabinetCount() > 0;
  }

  markProjectAsClean(): void {
    this._cleanWorkspaceSignature.set(this.buildPersistedWorkspaceSignature());
  }

  clearSelectedWallCabinets(): void {
    this.workspaceStore.clearSelectedWallCabinets();
  }

  private buildPersistedWorkspaceSignature(): string {
    // Intentionally tracks only project-persisted workspace data.
    // We compare saved/loaded project state (walls, project-level dimensions and persisted project settings),
    // not global user defaults like distanceFromWall/plinthSetback/frontGap that are not stored in the project record.
    return JSON.stringify({
      walls: this.requestsFacade.buildProjectWalls(),
      plinthHeightMm: this.settingsService.plinthHeightMm(),
      countertopThicknessMm: this.settingsService.countertopThicknessMm(),
      upperFillerHeightMm: this.settingsService.upperFillerHeightMm(),
      roomWidthMm: this.metadataService.currentProjectRoomWidthMm(),
      roomDepthMm: this.metadataService.currentProjectRoomDepthMm()
    });
  }
}
