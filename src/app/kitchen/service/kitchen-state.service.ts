import { Injectable, signal, computed } from '@angular/core';
import {
  KitchenCabinet,
  KitchenWallConfig,
  CabinetPosition,
  CabinetFormData,
  CabinetCalculationResult,
  WallWithCabinets,
  CabinetZone,
  getCabinetZone
} from '../model/kitchen-state.model';
import {
  KitchenProjectRequest,
  ProjectCabinetRequest,
  WallType,
  WALL_TYPES,
  CreateKitchenProjectRequest,
  ProjectWallRequest,
  MultiWallCalculateRequest,
  DrawerRequest
} from '../model/kitchen-project.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';

@Injectable({
  providedIn: 'root'
})
export class KitchenStateService {

  // ============ MULTI-WALL STATE ============

  private _walls = signal<WallWithCabinets[]>([
    {
      id: 'wall-1',
      type: 'MAIN',
      widthMm: 3600,
      heightMm: 2600,
      cabinets: []
    }
  ]);

  private _selectedWallId = signal<string>('wall-1');
  private _wallIdCounter = 1;
  private _cabinetIdCounter = 0;

  // ============ PUBLIC SIGNALS ============

  readonly walls = this._walls.asReadonly();
  readonly selectedWallId = this._selectedWallId.asReadonly();

  readonly selectedWall = computed(() => {
    const wallId = this._selectedWallId();
    return this._walls().find(w => w.id === wallId) ?? this._walls()[0];
  });

  // Legacy compatibility - returns selected wall config
  readonly wall = computed((): KitchenWallConfig => {
    const selected = this.selectedWall();
    return {
      length: selected?.widthMm ?? 3600,
      height: selected?.heightMm ?? 2600
    };
  });

  // Returns cabinets from selected wall only
  readonly cabinets = computed((): KitchenCabinet[] => {
    return this.selectedWall()?.cabinets ?? [];
  });

  // ============ COMPUTED VALUES ============

  readonly totalCost = computed(() => {
    // Sum costs from ALL walls
    return this._walls().reduce((wallSum, wall) => {
      return wallSum + wall.cabinets.reduce((cabSum, cab) => {
        return cabSum + (cab.calculatedResult?.totalCost ?? 0);
      }, 0);
    }, 0);
  });

  readonly selectedWallTotalCost = computed(() => {
    return this.cabinets().reduce((sum, cab) => {
      return sum + (cab.calculatedResult?.totalCost ?? 0);
    }, 0);
  });

  /**
   * Oblicza zajętą szerokość w strefie dolnej.
   */
  readonly usedWidthBottom = computed(() => {
    let currentX = 0;
    for (const cabinet of this.cabinets()) {
      const zone = getCabinetZone(cabinet);
      if (zone === 'BOTTOM' || zone === 'FULL') {
        currentX += cabinet.width;
      }
    }
    return currentX;
  });

  /**
   * Oblicza zajętą szerokość w strefie górnej.
   */
  readonly usedWidthTop = computed(() => {
    let currentX = 0;
    for (const cabinet of this.cabinets()) {
      const zone = getCabinetZone(cabinet);
      if (zone === 'TOP' || zone === 'FULL') {
        currentX += cabinet.width;
      }
    }
    return currentX;
  });

  /**
   * Maksymalna zajęta szerokość (z obu stref).
   * Legacy compatibility.
   */
  readonly totalWidth = computed(() => {
    return Math.max(this.usedWidthBottom(), this.usedWidthTop());
  });

  /**
   * Sprawdza czy wszystkie szafki mieszczą się na ścianie.
   * Sprawdza obie strefy osobno.
   */
  readonly fitsOnWall = computed(() => {
    const wall = this.selectedWall();
    if (!wall) return true;
    return this.usedWidthBottom() <= wall.widthMm && this.usedWidthTop() <= wall.widthMm;
  });

  /**
   * Minimalna pozostała szerokość (z obu stref).
   */
  readonly remainingWidth = computed(() => {
    const wall = this.selectedWall();
    if (!wall) return 0;
    const remainingBottom = wall.widthMm - this.usedWidthBottom();
    const remainingTop = wall.widthMm - this.usedWidthTop();
    return Math.min(remainingBottom, remainingTop);
  });

  /**
   * Pozostała szerokość w strefie dolnej.
   */
  readonly remainingWidthBottom = computed(() => {
    const wall = this.selectedWall();
    return wall ? wall.widthMm - this.usedWidthBottom() : 0;
  });

  /**
   * Pozostała szerokość w strefie górnej.
   */
  readonly remainingWidthTop = computed(() => {
    const wall = this.selectedWall();
    return wall ? wall.widthMm - this.usedWidthTop() : 0;
  });

  /**
   * Oblicza pozycje szafek z osobnymi licznikami X dla każdej strefy.
   * - Szafki dolne (BOTTOM) mają własny licznik currentXBottom
   * - Szafki górne (TOP) mają własny licznik currentXTop
   * - Słupki (FULL) zajmują miejsce w OBU strefach
   */
  readonly cabinetPositions = computed((): CabinetPosition[] => {
    const positions: CabinetPosition[] = [];
    let currentXBottom = 0;
    let currentXTop = 0;

    for (const cabinet of this.cabinets()) {
      const zone = getCabinetZone(cabinet);
      let x: number;

      switch (zone) {
        case 'FULL':
          // Słupek zajmuje miejsce w obu strefach
          // Pozycja X = maksimum z obu liczników (aby nie nakładał się na nic)
          x = Math.max(currentXBottom, currentXTop);
          currentXBottom = x + cabinet.width;
          currentXTop = x + cabinet.width;
          break;

        case 'TOP':
          // Szafka górna - używa licznika górnego
          x = currentXTop;
          currentXTop += cabinet.width;
          break;

        case 'BOTTOM':
        default:
          // Szafka dolna - używa licznika dolnego
          x = currentXBottom;
          currentXBottom += cabinet.width;
          break;
      }

      positions.push({
        cabinetId: cabinet.id,
        name: cabinet.name,
        x,
        y: cabinet.positionY ?? 0,
        width: cabinet.width,
        height: cabinet.height
      });
    }

    return positions;
  });

  readonly totalCabinetCount = computed(() => {
    return this._walls().reduce((sum, wall) => sum + wall.cabinets.length, 0);
  });

  // ============ WALL MANAGEMENT ============

  addWall(type: WallType, widthMm: number, heightMm: number): string {
    this._wallIdCounter++;
    const newWallId = `wall-${this._wallIdCounter}`;

    const newWall: WallWithCabinets = {
      id: newWallId,
      type,
      widthMm,
      heightMm,
      cabinets: []
    };

    this._walls.update(walls => [...walls, newWall]);
    this._selectedWallId.set(newWallId);

    return newWallId;
  }

  removeWall(wallId: string): void {
    const walls = this._walls();

    // Don't allow removing the last wall
    if (walls.length <= 1) {
      return;
    }

    // If removing selected wall, select another one
    if (this._selectedWallId() === wallId) {
      const otherWall = walls.find(w => w.id !== wallId);
      if (otherWall) {
        this._selectedWallId.set(otherWall.id);
      }
    }

    this._walls.update(w => w.filter(wall => wall.id !== wallId));
  }

  selectWall(wallId: string): void {
    const wall = this._walls().find(w => w.id === wallId);
    if (wall) {
      this._selectedWallId.set(wallId);
    }
  }

  updateWallDimensions(wallId: string, widthMm: number, heightMm: number): void {
    this._walls.update(walls =>
      walls.map(wall => {
        if (wall.id !== wallId) return wall;
        return { ...wall, widthMm, heightMm };
      })
    );
  }

  getWallLabel(type: WallType): string {
    return WALL_TYPES.find(wt => wt.value === type)?.label ?? type;
  }

  isWallTypeUsed(type: WallType): boolean {
    // MAIN, LEFT, RIGHT can only appear once
    if (type === 'MAIN' || type === 'LEFT' || type === 'RIGHT') {
      return this._walls().some(w => w.type === type);
    }
    return false;
  }

  getAvailableWallTypes(): { value: WallType; label: string }[] {
    return WALL_TYPES.filter(wt => !this.isWallTypeUsed(wt.value));
  }

  // ============ CABINET MANAGEMENT ============

  private generateCabinetId(): string {
    this._cabinetIdCounter++;
    return `cabinet-${this._cabinetIdCounter}`;
  }

  addCabinet(formData: CabinetFormData, calculatedResult: any): void {
    const newCabinet: KitchenCabinet = {
      id: this.generateCabinetId(),
      name: formData.name,
      type: formData.kitchenCabinetType,
      openingType: formData.openingType,
      width: formData.width,
      height: formData.height,
      depth: formData.depth,
      positionY: formData.positionY ?? 0,
      shelfQuantity: formData.shelfQuantity,
      drawerQuantity: formData.drawerQuantity,
      drawerModel: formData.drawerModel ?? undefined,
      calculatedResult: this.mapCalculationResult(calculatedResult)
    };

    const selectedWallId = this._selectedWallId();

    this._walls.update(walls =>
      walls.map(wall => {
        if (wall.id !== selectedWallId) return wall;
        return {
          ...wall,
          cabinets: [...wall.cabinets, newCabinet]
        };
      })
    );
  }

  removeCabinet(cabinetId: string): void {
    this._walls.update(walls =>
      walls.map(wall => ({
        ...wall,
        cabinets: wall.cabinets.filter(cab => cab.id !== cabinetId)
      }))
    );
  }

  getCabinetById(cabinetId: string): KitchenCabinet | undefined {
    for (const wall of this._walls()) {
      const cabinet = wall.cabinets.find(cab => cab.id === cabinetId);
      if (cabinet) return cabinet;
    }
    return undefined;
  }

  updateCabinet(cabinetId: string, formData: CabinetFormData, calculatedResult: any): void {
    this._walls.update(walls =>
      walls.map(wall => ({
        ...wall,
        cabinets: wall.cabinets.map(cab => {
          if (cab.id !== cabinetId) return cab;

          return {
            ...cab,
            name: formData.name,
            type: formData.kitchenCabinetType,
            openingType: formData.openingType,
            width: formData.width,
            height: formData.height,
            depth: formData.depth,
            positionY: formData.positionY ?? 0,
            shelfQuantity: formData.shelfQuantity,
            drawerQuantity: formData.drawerQuantity,
            drawerModel: formData.drawerModel ?? undefined,
            calculatedResult: this.mapCalculationResult(calculatedResult)
          };
        })
      }))
    );
  }

  // Legacy: update wall (selected wall)
  updateWall(config: Partial<KitchenWallConfig>): void {
    const selectedWallId = this._selectedWallId();
    this._walls.update(walls =>
      walls.map(wall => {
        if (wall.id !== selectedWallId) return wall;
        return {
          ...wall,
          widthMm: config.length ?? wall.widthMm,
          heightMm: config.height ?? wall.heightMm
        };
      })
    );
  }

  clearAll(): void {
    this._walls.set([
      {
        id: 'wall-1',
        type: 'MAIN',
        widthMm: 3600,
        heightMm: 2600,
        cabinets: []
      }
    ]);
    this._selectedWallId.set('wall-1');
    this._wallIdCounter = 1;
    this._cabinetIdCounter = 0;
  }

  clearSelectedWallCabinets(): void {
    const selectedWallId = this._selectedWallId();
    this._walls.update(walls =>
      walls.map(wall => {
        if (wall.id !== selectedWallId) return wall;
        return { ...wall, cabinets: [] };
      })
    );
  }

  // ============ PROJECT BUILDING ============

  /**
   * Buduje request do kalkulacji całego projektu kuchni (legacy - single wall).
   * Automatycznie oblicza pozycje X (od lewej do prawej).
   */
  buildProjectRequest(): KitchenProjectRequest {
    const selectedWall = this.selectedWall();
    const cabinets = selectedWall?.cabinets ?? [];

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
        length: selectedWall?.widthMm ?? 3600,
        height: selectedWall?.heightMm ?? 2600
      },
      cabinets: projectCabinets
    };
  }

  /**
   * Buduje request do kalkulacji wielu ścian (bez zapisu).
   */
  buildMultiWallCalculateRequest(): MultiWallCalculateRequest {
    return {
      walls: this.buildProjectWalls()
    };
  }

  /**
   * Buduje request do utworzenia projektu z wieloma ścianami (z zapisem do bazy).
   */
  buildMultiWallProjectRequest(name: string, description?: string): CreateKitchenProjectRequest {
    return {
      name,
      description,
      walls: this.buildProjectWalls()
    };
  }

  /**
   * Helper: buduje listę ścian z szafkami dla requestów.
   */
  private buildProjectWalls(): ProjectWallRequest[] {
    const walls = this._walls();

    return walls.map(wall => {
      let currentX = 0;

      const cabinets: ProjectCabinetRequest[] = wall.cabinets.map(cab => {
        // Przygotuj drawerRequest dla szafek z szufladami
        let drawerRequest: DrawerRequest | undefined;
        if (cab.type === KitchenCabinetType.BASE_WITH_DRAWERS && cab.drawerQuantity && cab.drawerModel) {
          drawerRequest = {
            drawerQuantity: cab.drawerQuantity,
            drawerModel: cab.drawerModel,
            drawerBaseHdf: false,
            drawerFrontDetails: null
          };
        }

        const request: ProjectCabinetRequest = {
          cabinetId: cab.name || cab.id, // użyj nazwy jeśli jest, inaczej ID
          kitchenCabinetType: cab.type,
          openingType: cab.openingType,
          height: cab.height,
          width: cab.width,
          depth: cab.depth,
          positionX: currentX,
          positionY: cab.positionY ?? 0,
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
          },
          drawerRequest
        };
        currentX += cab.width;
        return request;
      });

      return {
        wallType: wall.type,
        widthMm: wall.widthMm,
        heightMm: wall.heightMm,
        cabinets
      };
    });
  }

  // ============ PRIVATE HELPERS ============

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
