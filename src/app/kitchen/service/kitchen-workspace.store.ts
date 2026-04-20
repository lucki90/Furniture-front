import { Injectable, signal } from '@angular/core';
import { CabinetResponse } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { CabinetFormData, CountertopConfig, KitchenCabinet, PlinthConfig, WallWithCabinets } from '../model/kitchen-state.model';
import { WallType } from '../model/kitchen-project.model';
import { KitchenCabinetStateFactory } from './kitchen-cabinet-state.factory';

function createDefaultMainWall(countertopThicknessMm: number): WallWithCabinets {
  return {
    id: 'wall-1',
    type: 'MAIN',
    widthMm: 3600,
    heightMm: 2600,
    cabinets: [],
    countertopConfig: {
      enabled: true,
      materialType: 'LAMINATE',
      thicknessMm: countertopThicknessMm,
      jointType: 'NONE',
      edgeType: 'ABS_EDGE',
      sideOverhangExtraMm: 5
    },
    plinthConfig: {
      enabled: true,
      feetType: 'FEET_100',
      materialType: 'PVC'
    }
  };
}

@Injectable({
  providedIn: 'root'
})
export class KitchenWorkspaceStore {
  private _walls = signal<WallWithCabinets[]>([createDefaultMainWall(38)]);
  private _selectedWallId = signal<string>('wall-1');
  private _wallIdCounter = 1;
  private _cabinetIdCounter = 0;

  readonly walls = this._walls.asReadonly();
  readonly selectedWallId = this._selectedWallId.asReadonly();

  constructor(private cabinetFactory: KitchenCabinetStateFactory) {}

  getWallsSnapshot(): WallWithCabinets[] {
    return this._walls();
  }

  addWall(type: WallType, widthMm: number, heightMm: number, defaultCountertopThicknessMm: number): string {
    this._wallIdCounter++;
    const newWallId = `wall-${this._wallIdCounter}`;

    this._walls.update(walls => [
      ...walls,
      {
        id: newWallId,
        type,
        widthMm,
        heightMm,
        cabinets: [],
        countertopConfig: {
          enabled: true,
          materialType: 'LAMINATE',
          thicknessMm: defaultCountertopThicknessMm,
          jointType: 'NONE',
          edgeType: 'ABS_EDGE',
          sideOverhangExtraMm: 5
        },
        plinthConfig: {
          enabled: true,
          feetType: 'FEET_100',
          materialType: 'PVC'
        }
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
    this._walls.update(walls =>
      walls.map(wall => wall.id === wallId ? { ...wall, widthMm, heightMm } : wall)
    );
  }

  updateCountertopConfig(wallId: string, config: CountertopConfig): void {
    this._walls.update(walls =>
      walls.map(wall => wall.id === wallId ? { ...wall, countertopConfig: config } : wall)
    );
  }

  updatePlinthConfig(wallId: string, config: PlinthConfig): void {
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
    this._walls.update(walls =>
      walls.map(wall => ({
        ...wall,
        cabinets: wall.cabinets.filter(cabinet => cabinet.id !== cabinetId)
      }))
    );
  }

  cloneCabinet(cabinetId: string): void {
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
    const updatedCabinet = this.cabinetFactory.fromFormData(formData, cabinetId, calculatedResult);
    this._walls.update(walls =>
      walls.map(wall => ({
        ...wall,
        cabinets: wall.cabinets.map(cabinet => cabinet.id === cabinetId ? updatedCabinet : cabinet)
      }))
    );
  }

  clearSelectedWallCabinets(): void {
    const selectedWallId = this._selectedWallId();
    this._walls.update(walls =>
      walls.map(wall => wall.id === selectedWallId ? { ...wall, cabinets: [] } : wall)
    );
  }

  resetWorkspace(defaultCountertopThicknessMm: number): void {
    this._walls.set([createDefaultMainWall(defaultCountertopThicknessMm)]);
    this._selectedWallId.set('wall-1');
    this._wallIdCounter = 1;
    this._cabinetIdCounter = 0;
  }

  applyLoadedProject(walls: WallWithCabinets[], wallIdCounter: number, cabinetIdCounter: number): void {
    this._wallIdCounter = wallIdCounter;
    this._cabinetIdCounter = cabinetIdCounter;
    this._walls.set(walls);
    this._selectedWallId.set(walls[0].id);
  }

  private generateCabinetId(): string {
    this._cabinetIdCounter++;
    return `cabinet-${this._cabinetIdCounter}`;
  }
}
