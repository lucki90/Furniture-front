import { Injectable, signal, computed } from '@angular/core';
import {
  KitchenCabinet,
  KitchenWallConfig,
  CabinetPosition,
  CabinetFormData,
  CabinetCalculationResult
} from '../model/kitchen-state.model';
import { KitchenProjectRequest, ProjectCabinetRequest } from '../model/kitchen-project.model';

@Injectable({
  providedIn: 'root'
})
export class KitchenStateService {

  private _wall = signal<KitchenWallConfig>({
    length: 3600,
    height: 2600
  });

  private _cabinets = signal<KitchenCabinet[]>([]);

  private _idCounter = 0;

  readonly wall = this._wall.asReadonly();
  readonly cabinets = this._cabinets.asReadonly();

  readonly totalCost = computed(() => {
    return this._cabinets().reduce((sum, cab) => {
      return sum + (cab.calculatedResult?.totalCost ?? 0);
    }, 0);
  });

  readonly totalWidth = computed(() => {
    return this._cabinets().reduce((sum, cab) => sum + cab.width, 0);
  });

  readonly fitsOnWall = computed(() => {
    return this.totalWidth() <= this._wall().length;
  });

  readonly remainingWidth = computed(() => {
    return this._wall().length - this.totalWidth();
  });

  readonly cabinetPositions = computed((): CabinetPosition[] => {
    const positions: CabinetPosition[] = [];
    let currentX = 0;

    for (const cabinet of this._cabinets()) {
      positions.push({
        cabinetId: cabinet.id,
        x: currentX,
        width: cabinet.width,
        height: cabinet.height
      });
      currentX += cabinet.width;
    }

    return positions;
  });

  private generateId(): string {
    this._idCounter++;
    return `cabinet-${this._idCounter}`;
  }

  addCabinet(formData: CabinetFormData, calculatedResult: any): void {
    const newCabinet: KitchenCabinet = {
      id: this.generateId(),
      type: formData.kitchenCabinetType,
      openingType: formData.openingType,
      width: formData.width,
      height: formData.height,
      depth: formData.depth,
      shelfQuantity: formData.shelfQuantity,
      calculatedResult: this.mapCalculationResult(calculatedResult)
    };

    this._cabinets.update(cabinets => [...cabinets, newCabinet]);
  }

  removeCabinet(cabinetId: string): void {
    this._cabinets.update(cabinets =>
      cabinets.filter(cab => cab.id !== cabinetId)
    );
  }

  getCabinetById(cabinetId: string): KitchenCabinet | undefined {
    return this._cabinets().find(cab => cab.id === cabinetId);
  }

  updateCabinet(cabinetId: string, formData: CabinetFormData, calculatedResult: any): void {
    this._cabinets.update(cabinets =>
      cabinets.map(cab => {
        if (cab.id !== cabinetId) return cab;

        return {
          ...cab,
          type: formData.kitchenCabinetType,
          openingType: formData.openingType,
          width: formData.width,
          height: formData.height,
          depth: formData.depth,
          shelfQuantity: formData.shelfQuantity,
          calculatedResult: this.mapCalculationResult(calculatedResult)
        };
      })
    );
  }

  updateWall(config: Partial<KitchenWallConfig>): void {
    this._wall.update(wall => ({
      ...wall,
      ...config
    }));
  }

  clearAll(): void {
    this._cabinets.set([]);
  }

  /**
   * Buduje request do kalkulacji całego projektu kuchni.
   * Automatycznie oblicza pozycje X (od lewej do prawej).
   */
  buildProjectRequest(): KitchenProjectRequest {
    const cabinets = this._cabinets();
    const wall = this._wall();

    // Oblicz pozycje X automatycznie
    let currentX = 0;
    const projectCabinets: ProjectCabinetRequest[] = cabinets.map(cab => {
      const request: ProjectCabinetRequest = {
        cabinetId: cab.id,
        kitchenCabinetType: cab.type,
        openingType: cab.openingType,
        height: cab.height,
        width: cab.width,
        depth: cab.depth,
        positionX: currentX,
        positionY: 0, // MVP: wszystkie szafki na podłodze
        shelfQuantity: cab.shelfQuantity,
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
      currentX += cab.width;
      return request;
    });

    return {
      wall: {
        length: wall.length,
        height: wall.height
      },
      cabinets: projectCabinets
    };
  }

  private mapCalculationResult(result: any): CabinetCalculationResult | undefined {
    if (!result) return undefined;

    return {
      totalCost: result.totalCost ?? 0,
      boardCosts: result.boardCosts ?? 0,
      componentCosts: result.componentCosts ?? 0,
      jobCosts: result.jobCosts ?? 0
    };
  }
}
