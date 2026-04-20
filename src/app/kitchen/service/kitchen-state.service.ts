// TODO R.12: Continue extracting remaining geometry calculations (countertopZoneRects, plinthPosition,
// fillerPosition, computeJoinPositions) into KitchenGeometryService to reduce this facade further.
import { Injectable, computed, inject } from '@angular/core';
import { ProjectRequestBuilderService } from './project-request-builder.service';
import { ProjectSettingsService } from './project-settings.service';
import { ProjectMetadataService } from './project-metadata.service';
import { KitchenGeometryService } from './kitchen-geometry.service';
import { KitchenProjectStateMapper } from './kitchen-project-state.mapper';
import { KitchenWorkspaceStore } from './kitchen-workspace.store';
import {
  CabinetPosition,
  CabinetFormData,
  CountertopConfig,
  KitchenCabinet,
  KitchenWallConfig,
  PlinthConfig,
  isFreestandingAppliance
} from '../model/kitchen-state.model';
import {
  CreateKitchenProjectRequest,
  KitchenProjectDetailResponse,
  KitchenProjectRequest,
  MultiWallCalculateRequest,
  ProjectCabinetRequest,
  ProjectStatus,
  ProjectWallRequest,
  UpdateKitchenProjectRequest,
  WALL_TYPES,
  WallType
} from '../model/kitchen-project.model';
import { CabinetResponse } from '../cabinet-form/model/kitchen-cabinet-form.model';

@Injectable({
  providedIn: 'root'
})
export class KitchenStateService {
  // TODO(CODEX): To nadal jest centralna fasada dla zbyt wielu odpowiedzialnosci feature'a kitchen.
  // Po wydzieleniu geometry/mapowania/store kolejnym krokiem powinno byc przeniesienie legacy request
  // building i pozostalych helperow layoutu do wezszych serwisow, zeby KitchenStateService zostal cienkim API dla UI.
  private requestBuilder = inject(ProjectRequestBuilderService);
  private settingsService = inject(ProjectSettingsService);
  private metadataService = inject(ProjectMetadataService);
  private geometryService = inject(KitchenGeometryService);
  private projectStateMapper = inject(KitchenProjectStateMapper);
  private workspaceStore = inject(KitchenWorkspaceStore);

  readonly walls = this.workspaceStore.walls;
  readonly selectedWallId = this.workspaceStore.selectedWallId;

  readonly currentProjectId = this.metadataService.currentProjectId;
  readonly currentProjectName = this.metadataService.currentProjectName;
  readonly currentProjectDescription = this.metadataService.currentProjectDescription;
  readonly currentProjectClientName = this.metadataService.currentProjectClientName;
  readonly currentProjectClientPhone = this.metadataService.currentProjectClientPhone;
  readonly currentProjectClientEmail = this.metadataService.currentProjectClientEmail;
  readonly currentProjectVersion = this.metadataService.currentProjectVersion;
  readonly currentProjectStatus = this.metadataService.currentProjectStatus;
  readonly currentProjectAllowedTransitions = this.metadataService.currentProjectAllowedTransitions;

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

  readonly usedWidthBottom = computed(() => {
    return this.geometryService.calculateUsedWidth(this.cabinets(), 'BOTTOM', this.settingsService.fillerWidthMm());
  });

  readonly usedWidthTop = computed(() => {
    return this.geometryService.calculateUsedWidth(this.cabinets(), 'TOP', this.settingsService.fillerWidthMm());
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
      wallHeightMm: this.selectedWall()?.heightMm ?? 2600,
      plinthHeightMm: this.settingsService.plinthHeightMm(),
      countertopThicknessMm: this.settingsService.countertopThicknessMm(),
      upperFillerHeightMm: this.settingsService.upperFillerHeightMm(),
      fillerWidthMm: this.settingsService.fillerWidthMm()
    });
  });

  readonly totalCabinetCount = computed(() => {
    return this.walls().reduce((sum, wall) => sum + wall.cabinets.length, 0);
  });

  addWall(type: WallType, widthMm: number, heightMm: number): string {
    return this.workspaceStore.addWall(
      type,
      widthMm,
      heightMm,
      this.settingsService.getGlobalDefaultCountertopThicknessMm()
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

  updateProjectSettings(settings: Parameters<ProjectSettingsService['updateProjectSettings']>[0]): void {
    this.settingsService.updateProjectSettings(settings);
  }

  setGlobalDefaults(settings: Parameters<ProjectSettingsService['setGlobalDefaults']>[0]): void {
    this.settingsService.setGlobalDefaults(settings);
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
    this.workspaceStore.resetWorkspace(this.settingsService.getGlobalDefaultCountertopThicknessMm());
    this.metadataService.clearMetadata();
    this.settingsService.resetToGlobalDefaults();
  }

  loadProject(project: KitchenProjectDetailResponse): void {
    const mappedState = this.projectStateMapper.mapProject(project);
    this.workspaceStore.applyLoadedProject(mappedState.walls, mappedState.wallIdCounter, mappedState.cabinetIdCounter);
    this.metadataService.applyLoadedProject(project);

    this.settingsService.applyProjectSettings(
      project.plinthHeightMm ?? 100,
      project.countertopThicknessMm ?? 38,
      project.upperFillerHeightMm ?? 100
    );
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
      upperFillerHeightMm: this.settingsService.upperFillerHeightMm()
    };
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
    clientEmail?: string
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
      clientEmail
    );
  }

  hasUnsavedProject(): boolean {
    return this.metadataService.currentProjectId() === null && this.totalCabinetCount() > 0;
  }

  clearSelectedWallCabinets(): void {
    this.workspaceStore.clearSelectedWallCabinets();
  }

  buildProjectRequest(): KitchenProjectRequest {
    const selectedWall = this.selectedWall();
    const cabinets = selectedWall?.cabinets ?? [];

    let currentX = 0;
    const projectCabinets: ProjectCabinetRequest[] = cabinets.map(cabinet => {
      const request: ProjectCabinetRequest = {
        cabinetId: cabinet.id,
        kitchenCabinetType: cabinet.type,
        openingType: cabinet.openingType,
        height: cabinet.height,
        width: cabinet.width,
        depth: cabinet.depth,
        positionX: currentX,
        positionY: 0,
        shelfQuantity: cabinet.shelfQuantity,
        varnishedFront: false,
        materialRequest: {
          boxMaterial: 'CHIPBOARD',
          boxBoardThickness: 18,
          boxColor: 'WHITE',
          boxVeneerColor: 'WHITE',
          frontMaterial: 'CHIPBOARD',
          frontBoardThickness: 18,
          frontColor: 'WHITE',
          frontVeneerColor: 'WHITE'
        }
      };
      currentX += cabinet.width;
      return request;
    });

    // TODO(CODEX): buildProjectRequest to nadal legacy flow ze sztywnymi materialRequest defaults na froncie.
    // Jesli ten endpoint jest jeszcze uzywany, materialy i domyslne parametry powinny pochodzic z backendu
    // albo przynajmniej z jednego wspolnego mappera ustawien, bo inaczej request latwo rozjedzie sie z reszta kitchen.
    return {
      wall: {
        length: selectedWall?.widthMm ?? 3600,
        height: selectedWall?.heightMm ?? 2600
      },
      cabinets: projectCabinets
    };
  }

  buildMultiWallCalculateRequest(): MultiWallCalculateRequest {
    const connections = this.requestBuilder.buildConnections(this.walls());
    return {
      walls: this.buildProjectWalls(),
      connections: connections.length > 0 ? connections : undefined
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
      upperFillerHeightMm: this.settingsService.upperFillerHeightMm()
    };
  }

  private buildProjectWalls(): ProjectWallRequest[] {
    return this.requestBuilder.buildProjectWalls(this.walls(), {
      plinthHeightMm: this.settingsService.plinthHeightMm(),
      countertopThicknessMm: this.settingsService.countertopThicknessMm(),
      upperFillerHeightMm: this.settingsService.upperFillerHeightMm(),
      fillerWidthMm: this.settingsService.fillerWidthMm(),
      materialDefaults: this.settingsService.materialDefaults()
    });
  }
}
