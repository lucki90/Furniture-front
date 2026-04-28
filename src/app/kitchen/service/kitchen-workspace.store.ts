import { Injectable, Signal, signal } from '@angular/core';
import { CabinetResponse } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { CabinetFormData, CountertopConfig, KitchenCabinet, PlinthConfig, WallWithCabinets } from '../model/kitchen-state.model';
import { IslandAdjacentSide, WallType } from '../model/kitchen-project.model';
import { KitchenCabinetStateFactory } from './kitchen-cabinet-state.factory';
import { KitchenHistoryService, WorkspaceSnapshot } from './kitchen-history.service';
import { ProjectSettingsService } from './project-settings.service';
import { ProjectMetadataService } from './project-metadata.service';

export interface AddWallOptions {
  islandDepthMm?: number;
  adjacentToWall?: IslandAdjacentSide;
}

function createDefaultWall(
  type: WallType,
  countertopThicknessMm: number,
  defaultPlinthHeightMm: number,
  options?: AddWallOptions
): WallWithCabinets {
  return {
    id: 'wall-1',
    type,
    widthMm: type === 'ISLAND' ? 2400 : 3600,
    heightMm: type === 'ISLAND' ? 900 : 2600,
    cabinets: [],
    islandDepthMm: type === 'ISLAND' ? (options?.islandDepthMm ?? 900) : undefined,
    adjacentToWall: type === 'ISLAND' ? (options?.adjacentToWall ?? 'NONE') : undefined,
    leftSidePanelEnabled: type === 'ISLAND' ? false : undefined,
    rightSidePanelEnabled: type === 'ISLAND' ? false : undefined,
    backBlendaEnabled: type === 'ISLAND' ? false : undefined,
    countertopConfig: {
      enabled: true,
      materialType: 'LAMINATE',
      thicknessMm: countertopThicknessMm,
      jointType: 'NONE',
      edgeType: 'ABS_EDGE',
      sideOverhangExtraMm: 5,
      frontOverhangMm: 30,
      backOverhangMm: type === 'ISLAND' ? 30 : 0
    },
    plinthConfig: {
      enabled: true,
      heightMm: defaultPlinthHeightMm,
      materialType: 'PVC'
    }
  };
}

@Injectable({
  providedIn: 'root'
})
export class KitchenWorkspaceStore {
  private _walls = signal<WallWithCabinets[]>([createDefaultWall('MAIN', 38, 100)]);
  private _selectedWallId = signal<string>('wall-1');
  private _wallIdCounter = 1;
  private _cabinetIdCounter = 0;

  readonly walls = this._walls.asReadonly();
  readonly selectedWallId = this._selectedWallId.asReadonly();
  readonly canUndo: Signal<boolean>;
  readonly canRedo: Signal<boolean>;

  constructor(
    private cabinetFactory: KitchenCabinetStateFactory,
    private historyService: KitchenHistoryService,
    private settingsService: ProjectSettingsService,
    private metadataService: ProjectMetadataService
  ) {
    this.canUndo = this.historyService.canUndo;
    this.canRedo = this.historyService.canRedo;
  }

  getWallsSnapshot(): WallWithCabinets[] {
    return this._walls();
  }

  undo(): boolean {
    const previous = this.historyService.undo(this.snapshotCurrentState());
    if (!previous) {
      return false;
    }
    this.applySnapshot(previous);
    return true;
  }

  redo(): boolean {
    const next = this.historyService.redo(this.snapshotCurrentState());
    if (!next) {
      return false;
    }
    this.applySnapshot(next);
    return true;
  }

  /**
   * Publiczne celowo: czesc mutacji (np. metadata / standalone project settings)
   * nie przechodzi przez store, ale musi wpasc do tego samego stosu undo/redo.
   * Jedynym docelowym callerem powinien pozostac KitchenStateService.
   */
  recordHistorySnapshot(): void {
    this.historyService.push(this.snapshotCurrentState());
  }

  addWall(
    type: WallType,
    widthMm: number,
    heightMm: number,
    defaultCountertopThicknessMm: number,
    defaultPlinthHeightMm: number,
    options?: AddWallOptions
  ): string {
    this.recordHistorySnapshot();
    this._wallIdCounter++;
    const newWallId = `wall-${this._wallIdCounter}`;
    const defaultWall = createDefaultWall(type, defaultCountertopThicknessMm, defaultPlinthHeightMm, options);

    this._walls.update(walls => [
      ...walls,
      {
        ...defaultWall,
        id: newWallId,
        widthMm,
        heightMm
      }
    ]);
    this._selectedWallId.set(newWallId);

    return newWallId;
  }

  removeWall(wallId: string): void {
    const walls = this._walls();
    if (walls.length <= 1) {
      return;
    }
    this.recordHistorySnapshot();

    if (this._selectedWallId() === wallId) {
      const otherWall = walls.find(wall => wall.id !== wallId);
      if (otherWall) {
        this._selectedWallId.set(otherWall.id);
      }
    }

    this._walls.update(currentWalls => currentWalls.filter(wall => wall.id !== wallId));
  }

  selectWall(wallId: string): void {
    if (this._walls().some(wall => wall.id === wallId)) {
      this._selectedWallId.set(wallId);
    }
  }

  updateWallDimensions(wallId: string, widthMm: number, heightMm: number): void {
    this.recordHistorySnapshot();
    this._walls.update(walls =>
      walls.map(wall => wall.id === wallId ? { ...wall, widthMm, heightMm } : wall)
    );
  }

  updateWall(wallId: string, patch: Partial<WallWithCabinets>): void {
    this.recordHistorySnapshot();
    this._walls.update(walls =>
      walls.map(wall => wall.id === wallId ? { ...wall, ...patch } : wall)
    );
  }

  updateCountertopConfig(wallId: string, config: CountertopConfig): void {
    this.recordHistorySnapshot();
    this._walls.update(walls =>
      walls.map(wall => wall.id === wallId ? { ...wall, countertopConfig: config } : wall)
    );
  }

  updatePlinthConfig(wallId: string, config: PlinthConfig): void {
    this.recordHistorySnapshot();
    this._walls.update(walls =>
      walls.map(wall => wall.id === wallId ? { ...wall, plinthConfig: config } : wall)
    );
  }

  getCountertopConfig(wallId: string): CountertopConfig | undefined {
    return this._walls().find(wall => wall.id === wallId)?.countertopConfig;
  }

  getPlinthConfig(wallId: string): PlinthConfig | undefined {
    return this._walls().find(wall => wall.id === wallId)?.plinthConfig;
  }

  addCabinetToSelectedWall(formData: CabinetFormData, calculatedResult: CabinetResponse): void {
    this.recordHistorySnapshot();
    const newCabinet = this.cabinetFactory.fromFormData(formData, this.generateCabinetId(), calculatedResult);
    const selectedWallId = this._selectedWallId();

    this._walls.update(walls =>
      walls.map(wall => wall.id === selectedWallId
        ? { ...wall, cabinets: [...wall.cabinets, newCabinet] }
        : wall
      )
    );
  }

  removeCabinet(cabinetId: string): void {
    this.recordHistorySnapshot();
    this._walls.update(walls =>
      walls.map(wall => ({
        ...wall,
        cabinets: wall.cabinets.filter(cabinet => cabinet.id !== cabinetId)
      }))
    );
  }

  cloneCabinet(cabinetId: string): void {
    this.recordHistorySnapshot();
    const selectedWallId = this._selectedWallId();
    this._walls.update(walls =>
      walls.map(wall => {
        if (wall.id !== selectedWallId) return wall;
        const source = wall.cabinets.find(cabinet => cabinet.id === cabinetId);
        if (!source) return wall;

        return {
          ...wall,
          cabinets: [
            ...wall.cabinets,
            {
              ...structuredClone(source),
              id: this.generateCabinetId()
            }
          ]
        };
      })
    );
  }

  updateCabinet(cabinetId: string, formData: CabinetFormData, calculatedResult: CabinetResponse): void {
    this.recordHistorySnapshot();
    const updatedCabinet = this.cabinetFactory.fromFormData(formData, cabinetId, calculatedResult);
    this._walls.update(walls =>
      walls.map(wall => ({
        ...wall,
        cabinets: wall.cabinets.map(cabinet => cabinet.id === cabinetId ? updatedCabinet : cabinet)
      }))
    );
  }

  clearSelectedWallCabinets(): void {
    this.recordHistorySnapshot();
    const selectedWallId = this._selectedWallId();
    this._walls.update(walls =>
      walls.map(wall => wall.id === selectedWallId ? { ...wall, cabinets: [] } : wall)
    );
  }

  resetWorkspace(defaultCountertopThicknessMm: number, defaultPlinthHeightMm: number): void {
    this.historyService.clear();
    this._walls.set([createDefaultWall('MAIN', defaultCountertopThicknessMm, defaultPlinthHeightMm)]);
    this._selectedWallId.set('wall-1');
    this._wallIdCounter = 1;
    this._cabinetIdCounter = 0;
  }

  applyLoadedProject(walls: WallWithCabinets[], wallIdCounter: number, cabinetIdCounter: number): void {
    this.historyService.clear();
    this._wallIdCounter = wallIdCounter;
    this._cabinetIdCounter = cabinetIdCounter;
    this._walls.set(walls);
    this._selectedWallId.set(walls[0].id);
  }

  private snapshotCurrentState(): WorkspaceSnapshot {
    return {
      walls: structuredClone(this._walls()),
      selectedWallId: this._selectedWallId(),
      wallIdCounter: this._wallIdCounter,
      cabinetIdCounter: this._cabinetIdCounter,
      projectSettings: {
        plinthHeightMm: this.settingsService.plinthHeightMm(),
        countertopThicknessMm: this.settingsService.countertopThicknessMm(),
        upperFillerHeightMm: this.settingsService.upperFillerHeightMm(),
        distanceFromWallMm: this.settingsService.distanceFromWallMm(),
        plinthSetbackMm: this.settingsService.plinthSetbackMm(),
        fillerWidthMm: this.settingsService.fillerWidthMm(),
        frontGapMm: this.settingsService.frontGapMm(),
        supportHeightReductionMm: this.settingsService.supportHeightReductionMm(),
        supportWidthReductionMm: this.settingsService.supportWidthReductionMm()
      },
      projectMetadata: {
        roomWidthMm: this.metadataService.currentProjectRoomWidthMm(),
        roomDepthMm: this.metadataService.currentProjectRoomDepthMm()
      }
    };
  }

  private applySnapshot(snapshot: WorkspaceSnapshot): void {
    this._walls.set(snapshot.walls);
    this._selectedWallId.set(snapshot.selectedWallId);
    this._wallIdCounter = snapshot.wallIdCounter;
    this._cabinetIdCounter = snapshot.cabinetIdCounter;
    this.settingsService.updateProjectSettings(snapshot.projectSettings);
    this.metadataService.updateRoomDimensions(
      snapshot.projectMetadata.roomWidthMm,
      snapshot.projectMetadata.roomDepthMm
    );
  }

  private generateCabinetId(): string {
    this._cabinetIdCounter++;
    return `cabinet-${this._cabinetIdCounter}`;
  }
}
