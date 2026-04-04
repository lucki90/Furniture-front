import { Injectable, signal, computed, inject } from '@angular/core';
import { ProjectRequestBuilderService } from './project-request-builder.service';
import {
  KitchenCabinet,
  KitchenCabinetBase,
  KitchenWallConfig,
  CabinetPosition,
  CabinetFormData,
  CabinetCalculationResult,
  WallWithCabinets,
  CabinetZone,
  getCabinetZone,
  CountertopConfig,
  PlinthConfig,
  isUpperCabinetType,
  requiresCountertop,
  isFreestandingAppliance,
  hasSegments
} from '../model/kitchen-state.model';
import {
  KitchenProjectRequest,
  ProjectCabinetRequest,
  WallType,
  WALL_TYPES,
  CreateKitchenProjectRequest,
  ProjectWallRequest,
  MultiWallCalculateRequest,
  KitchenProjectDetailResponse,
  UpdateKitchenProjectRequest,
  ProjectStatus
} from '../model/kitchen-project.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { OpeningType } from '../cabinet-form/model/kitchen-cabinet-constants';
import { SegmentFormData } from '../cabinet-form/model/segment.model';
import { CornerMechanismType } from '../cabinet-form/model/corner-cabinet.model';

@Injectable({
  providedIn: 'root'
})
export class KitchenStateService {

  private requestBuilder = inject(ProjectRequestBuilderService);

  // ============ MULTI-WALL STATE ============

  private _walls = signal<WallWithCabinets[]>([
    {
      id: 'wall-1',
      type: 'MAIN',
      widthMm: 3600,
      heightMm: 2600,
      cabinets: [],
      // Domyślnie włączamy blat i cokół
      countertopConfig: {
        enabled: true,
        materialType: 'LAMINATE',
        thicknessMm: 38,
        jointType: 'NONE',
        edgeType: 'ABS_EDGE'
      },
      plinthConfig: {
        enabled: true,
        feetType: 'FEET_100',
        materialType: 'PVC'
      }
    }
  ]);

  private _selectedWallId = signal<string>('wall-1');
  private _wallIdCounter = 1;
  private _cabinetIdCounter = 0;

  // ============ PROJECT STATE ============

  private _currentProjectId = signal<number | null>(null);
  private _currentProjectName = signal<string | null>(null);
  private _currentProjectDescription = signal<string | null>(null);
  private _currentProjectClientName = signal<string | null>(null);
  private _currentProjectClientPhone = signal<string | null>(null);
  private _currentProjectClientEmail = signal<string | null>(null);
  private _currentProjectVersion = signal<number>(0);
  private _currentProjectStatus = signal<ProjectStatus>('DRAFT');
  private _currentProjectAllowedTransitions = signal<ProjectStatus[]>([]);

  // ============ PROJECT SETTINGS (globalne ustawienia) ============

  private _plinthHeightMm = signal<number>(100);           // Domyślna wysokość cokołu
  private _countertopThicknessMm = signal<number>(38);     // Domyślna grubość blatu
  private _upperFillerHeightMm = signal<number>(100);      // Domyślna wysokość blendy górnej

  // Ustawienia obudowy szafek
  private _distanceFromWallMm = signal<number>(560);       // Głębokość zabudowy
  private _plinthSetbackMm = signal<number>(60);           // Cofnięcie cokołu od frontu
  private _fillerWidthMm = signal<number>(50);             // Szerokość blendy bocznej
  private _frontGapMm = signal<number>(2);                 // Szczelina frontowa
  private _supportHeightReductionMm = signal<number>(30);  // Zmniejszenie podpory (H)
  private _supportWidthReductionMm = signal<number>(50);   // Zmniejszenie podpory (W)

  // Globalne defaults z user_settings DB — cache używany przez clearAll() i addWall()
  // Ustawiane JEDNOKROTNIE przy starcie przez setGlobalDefaults() z app.component.ts
  private _globalDefaultPlinthHeightMm = 100;
  private _globalDefaultCountertopThicknessMm = 38;
  private _globalDefaultUpperFillerHeightMm = 100;
  private _globalDefaultDistanceFromWallMm = 560;
  private _globalDefaultPlinthSetbackMm = 60;
  private _globalDefaultFillerWidthMm = 50;
  private _globalDefaultFrontGapMm = 2;
  private _globalDefaultSupportHeightReductionMm = 30;
  private _globalDefaultSupportWidthReductionMm = 50;

  // ============ PUBLIC SIGNALS ============

  readonly walls = this._walls.asReadonly();
  readonly selectedWallId = this._selectedWallId.asReadonly();
  readonly currentProjectId = this._currentProjectId.asReadonly();
  readonly currentProjectName = this._currentProjectName.asReadonly();
  readonly currentProjectDescription = this._currentProjectDescription.asReadonly();
  readonly currentProjectClientName = this._currentProjectClientName.asReadonly();
  readonly currentProjectClientPhone = this._currentProjectClientPhone.asReadonly();
  readonly currentProjectClientEmail = this._currentProjectClientEmail.asReadonly();
  readonly currentProjectVersion = this._currentProjectVersion.asReadonly();
  readonly currentProjectStatus = this._currentProjectStatus.asReadonly();
  readonly currentProjectAllowedTransitions = this._currentProjectAllowedTransitions.asReadonly();

  // Ustawienia projektu (publiczne)
  readonly plinthHeightMm = this._plinthHeightMm.asReadonly();
  readonly countertopThicknessMm = this._countertopThicknessMm.asReadonly();
  readonly upperFillerHeightMm = this._upperFillerHeightMm.asReadonly();

  // Ustawienia obudowy (publiczne)
  readonly distanceFromWallMm = this._distanceFromWallMm.asReadonly();
  readonly plinthSetbackMm = this._plinthSetbackMm.asReadonly();
  readonly fillerWidthMm = this._fillerWidthMm.asReadonly();
  readonly frontGapMm = this._frontGapMm.asReadonly();
  readonly supportHeightReductionMm = this._supportHeightReductionMm.asReadonly();
  readonly supportWidthReductionMm = this._supportWidthReductionMm.asReadonly();

  /**
   * Obliczona wysokość blatu od podłogi:
   * plinthHeight + corpusHeight (typowy 720mm) + countertopThickness
   * Uwaga: corpusHeight zależy od konkretnej szafki, tu podajemy bez niego.
   */
  readonly countertopSurfaceHeightMm = computed(() => {
    return this._plinthHeightMm() + this._countertopThicknessMm();
  });

  // ===== Sygnały przełączników widoczności (współdzielone między SVG front i floor plan) =====
  readonly showCountertop = signal(true);
  readonly showUpperCabinets = signal(true);

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
        currentX += this.enclosureOuterWidthMm(cabinet, 'left')
                 + cabinet.width
                 + this.enclosureOuterWidthMm(cabinet, 'right');
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
        currentX += this.enclosureOuterWidthMm(cabinet, 'left')
                 + cabinet.width
                 + this.enclosureOuterWidthMm(cabinet, 'right');
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
   * Pozycja Y jest obliczana dynamicznie na podstawie trybu pozycjonowania.
   */
  readonly cabinetPositions = computed((): CabinetPosition[] => {
    const positions: CabinetPosition[] = [];
    let currentXBottom = 0;
    let currentXTop = 0;

    const wall = this.selectedWall();
    const wallHeight = wall?.heightMm ?? 2600;
    const plinth = this._plinthHeightMm();
    const countertopThickness = this._countertopThicknessMm();
    const upperFiller = this._upperFillerHeightMm();

    // Oblicz maksymalną wysokość korpusu dolnych szafek (typowo 720mm).
    // Uwzględnia tylko szafki z blatem (requiresCountertop=true).
    // Wyklucza TALL_CABINET, BASE_FRIDGE (FULL zone), wolnostojące AGD — żeby nie zawyżać pozycji wiszących (T1 fix).
    const baseCabinets = this.cabinets().filter(c => requiresCountertop(c.type));
    const maxBaseCorpusHeight = baseCabinets.length > 0
      ? Math.max(...baseCabinets.map(c => c.height))
      : 720;

    // Wysokość blatu od podłogi
    const countertopHeight = plinth + maxBaseCorpusHeight + countertopThickness;

    for (const cabinet of this.cabinets()) {
      const zone = getCabinetZone(cabinet);
      let x: number;
      let y: number;

      switch (zone) {
        case 'FULL': {
          const leftW = this.enclosureOuterWidthMm(cabinet, 'left');
          const rightW = this.enclosureOuterWidthMm(cabinet, 'right');
          x = Math.max(currentXBottom, currentXTop) + leftW;
          currentXBottom = x + cabinet.width + rightW;
          currentXTop    = x + cabinet.width + rightW;
          y = plinth;
          break;
        }
        case 'TOP': {
          const leftW = this.enclosureOuterWidthMm(cabinet, 'left');
          x = currentXTop + leftW;
          currentXTop = x + cabinet.width + this.enclosureOuterWidthMm(cabinet, 'right');
          // Oblicz Y na podstawie trybu pozycjonowania
          if (cabinet.positioningMode === 'RELATIVE_TO_COUNTERTOP') {
            const gap = cabinet.gapFromCountertopMm ?? 500;
            y = countertopHeight + gap;
          } else {
            // RELATIVE_TO_CEILING (domyślne)
            y = wallHeight - upperFiller - cabinet.height;
          }
          break;
        }
        case 'BOTTOM':
        default: {
          const leftW = this.enclosureOuterWidthMm(cabinet, 'left');
          x = currentXBottom + leftW;
          currentXBottom = x + cabinet.width + this.enclosureOuterWidthMm(cabinet, 'right');
          y = plinth;
          break;
        }
      }

      positions.push({
        cabinetId: cabinet.id,
        name: cabinet.name,
        x,
        y,
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
      cabinets: [],
      // Domyślnie włączamy blat i cokół — grubość blatu z globalnych defaults
      countertopConfig: {
        enabled: true,
        materialType: 'LAMINATE',
        thicknessMm: this._globalDefaultCountertopThicknessMm,
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

  // ============ PROJECT SETTINGS MANAGEMENT ============

  updateProjectSettings(settings: {
    plinthHeightMm?: number;
    countertopThicknessMm?: number;
    upperFillerHeightMm?: number;
    distanceFromWallMm?: number;
    plinthSetbackMm?: number;
    fillerWidthMm?: number;
    frontGapMm?: number;
    supportHeightReductionMm?: number;
    supportWidthReductionMm?: number;
  }): void {
    if (settings.plinthHeightMm !== undefined) {
      this._plinthHeightMm.set(settings.plinthHeightMm);
    }
    if (settings.countertopThicknessMm !== undefined) {
      this._countertopThicknessMm.set(settings.countertopThicknessMm);
    }
    if (settings.upperFillerHeightMm !== undefined) {
      this._upperFillerHeightMm.set(settings.upperFillerHeightMm);
    }
    if (settings.distanceFromWallMm !== undefined) {
      this._distanceFromWallMm.set(settings.distanceFromWallMm);
    }
    if (settings.plinthSetbackMm !== undefined) {
      this._plinthSetbackMm.set(settings.plinthSetbackMm);
    }
    if (settings.fillerWidthMm !== undefined) {
      this._fillerWidthMm.set(settings.fillerWidthMm);
    }
    if (settings.frontGapMm !== undefined) {
      this._frontGapMm.set(settings.frontGapMm);
    }
    if (settings.supportHeightReductionMm !== undefined) {
      this._supportHeightReductionMm.set(settings.supportHeightReductionMm);
    }
    if (settings.supportWidthReductionMm !== undefined) {
      this._supportWidthReductionMm.set(settings.supportWidthReductionMm);
    }
  }

  /**
   * Zapisuje globalne defaults z user_settings DB i natychmiast je stosuje na sygnałach.
   * Wywoływać TYLKO raz przy starcie aplikacji (app.component.ts ngOnInit).
   * Dzięki temu clearAll() i addWall() mogą dziedziczyć wartości z bazy zamiast hardcoded stałych.
   */
  setGlobalDefaults(settings: {
    plinthHeightMm: number;
    countertopThicknessMm: number;
    upperFillerHeightMm: number;
    distanceFromWallMm?: number;
    plinthSetbackMm?: number;
    fillerWidthMm?: number;
    frontGapMm?: number;
    supportHeightReductionMm?: number;
    supportWidthReductionMm?: number;
  }): void {
    // Zapamiętaj jako globalne defaults (używane przez clearAll / addWall)
    this._globalDefaultPlinthHeightMm = settings.plinthHeightMm;
    this._globalDefaultCountertopThicknessMm = settings.countertopThicknessMm;
    this._globalDefaultUpperFillerHeightMm = settings.upperFillerHeightMm;
    if (settings.distanceFromWallMm !== undefined) {
      this._globalDefaultDistanceFromWallMm = settings.distanceFromWallMm;
    }
    if (settings.plinthSetbackMm !== undefined) {
      this._globalDefaultPlinthSetbackMm = settings.plinthSetbackMm;
    }
    if (settings.fillerWidthMm !== undefined) {
      this._globalDefaultFillerWidthMm = settings.fillerWidthMm;
    }
    if (settings.frontGapMm !== undefined) {
      this._globalDefaultFrontGapMm = settings.frontGapMm;
    }
    if (settings.supportHeightReductionMm !== undefined) {
      this._globalDefaultSupportHeightReductionMm = settings.supportHeightReductionMm;
    }
    if (settings.supportWidthReductionMm !== undefined) {
      this._globalDefaultSupportWidthReductionMm = settings.supportWidthReductionMm;
    }

    // Zastosuj od razu do live signals (żeby bieżący stan też był spójny)
    this.updateProjectSettings(settings);
  }

  // ============ COUNTERTOP & PLINTH CONFIG ============

  /**
   * Aktualizuje konfigurację blatu dla wybranej ściany.
   */
  updateCountertopConfig(wallId: string, config: CountertopConfig): void {
    this._walls.update(walls =>
      walls.map(wall => {
        if (wall.id !== wallId) return wall;
        return { ...wall, countertopConfig: config };
      })
    );
  }

  /**
   * Aktualizuje konfigurację cokołu dla wybranej ściany.
   */
  updatePlinthConfig(wallId: string, config: PlinthConfig): void {
    this._walls.update(walls =>
      walls.map(wall => {
        if (wall.id !== wallId) return wall;
        return { ...wall, plinthConfig: config };
      })
    );
  }

  /**
   * Pobiera konfigurację blatu dla wybranej ściany.
   */
  getCountertopConfig(wallId: string): CountertopConfig | undefined {
    const wall = this._walls().find(w => w.id === wallId);
    return wall?.countertopConfig;
  }

  /**
   * Pobiera konfigurację cokołu dla wybranej ściany.
   */
  getPlinthConfig(wallId: string): PlinthConfig | undefined {
    const wall = this._walls().find(w => w.id === wallId);
    return wall?.plinthConfig;
  }

  // ============ CABINET MANAGEMENT ============

  private generateCabinetId(): string {
    this._cabinetIdCounter++;
    return `cabinet-${this._cabinetIdCounter}`;
  }

  addCabinet(formData: CabinetFormData, calculatedResult: any): void {
    const newCabinet = this.buildCabinetFromFormData(formData, this.generateCabinetId(), calculatedResult);
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

  /**
   * Factory tworząca typowany KitchenCabinet z danych formularza.
   * Każdy case dostarcza TYLKO pola należące do danego typu — bez (formData as any).
   * Dodanie nowego typu = nowy case w tym switch (TypeScript wymusi obsługę).
   */
  private buildCabinetFromFormData(formData: CabinetFormData, id: string, calculatedResult: any): KitchenCabinet {
    const base: KitchenCabinetBase = {
      id,
      name: formData.name,
      openingType: formData.openingType,
      width: formData.width,
      height: formData.height,
      depth: formData.depth,
      positionY: formData.positionY ?? 0,
      shelfQuantity: formData.shelfQuantity,
      positioningMode: formData.positioningMode,
      gapFromCountertopMm: formData.gapFromCountertopMm,
      leftEnclosureType: formData.leftEnclosureType,
      rightEnclosureType: formData.rightEnclosureType,
      leftSupportPlate: formData.leftSupportPlate,
      rightSupportPlate: formData.rightSupportPlate,
      distanceFromWallMm: formData.distanceFromWallMm,
      leftFillerWidthOverrideMm: formData.leftFillerWidthOverrideMm,
      rightFillerWidthOverrideMm: formData.rightFillerWidthOverrideMm,
      bottomWreathOnFloor: formData.bottomWreathOnFloor ?? false,
      calculatedResult: this.mapCalculationResult(calculatedResult)
    };

    switch (formData.kitchenCabinetType) {
      case KitchenCabinetType.BASE_ONE_DOOR:
        return { ...base, type: KitchenCabinetType.BASE_ONE_DOOR };
      case KitchenCabinetType.BASE_TWO_DOOR:
        return { ...base, type: KitchenCabinetType.BASE_TWO_DOOR };
      case KitchenCabinetType.BASE_WITH_DRAWERS:
        return { ...base, type: KitchenCabinetType.BASE_WITH_DRAWERS,
          drawerQuantity: formData.drawerQuantity ?? 3,
          drawerModel: formData.drawerModel ?? 'ANTARO_TANDEMBOX' };
      case KitchenCabinetType.BASE_SINK:
        return { ...base, type: KitchenCabinetType.BASE_SINK,
          sinkFrontType: formData.sinkFrontType ?? 'ONE_DOOR',
          sinkApronEnabled: formData.sinkApronEnabled ?? true,
          sinkApronHeightMm: formData.sinkApronHeightMm ?? 150,
          sinkDrawerModel: formData.sinkDrawerModel };
      case KitchenCabinetType.BASE_COOKTOP:
        return { ...base, type: KitchenCabinetType.BASE_COOKTOP,
          cooktopType: formData.cooktopType ?? 'INDUCTION',
          cooktopFrontType: formData.cooktopFrontType ?? 'DRAWERS',
          drawerQuantity: formData.drawerQuantity,
          drawerModel: formData.drawerModel ?? undefined };
      case KitchenCabinetType.BASE_DISHWASHER:
        return { ...base, type: KitchenCabinetType.BASE_DISHWASHER };
      case KitchenCabinetType.BASE_DISHWASHER_FREESTANDING:
        return { ...base, type: KitchenCabinetType.BASE_DISHWASHER_FREESTANDING };
      case KitchenCabinetType.BASE_OVEN:
        return { ...base, type: KitchenCabinetType.BASE_OVEN,
          ovenHeightType: formData.ovenHeightType ?? 'STANDARD',
          ovenLowerSectionType: formData.ovenLowerSectionType ?? 'LOW_DRAWER',
          ovenApronEnabled: formData.ovenApronEnabled ?? false,
          ovenApronHeightMm: formData.ovenApronHeightMm ?? 60,
          drawerModel: formData.drawerModel ?? undefined };
      case KitchenCabinetType.BASE_OVEN_FREESTANDING:
        return { ...base, type: KitchenCabinetType.BASE_OVEN_FREESTANDING };
      case KitchenCabinetType.BASE_FRIDGE:
        return { ...base, type: KitchenCabinetType.BASE_FRIDGE,
          fridgeSectionType: formData.fridgeSectionType ?? 'TWO_DOORS',
          lowerFrontHeightMm: formData.lowerFrontHeightMm ?? 713,
          segments: formData.segments };
      case KitchenCabinetType.BASE_FRIDGE_FREESTANDING:
        return { ...base, type: KitchenCabinetType.BASE_FRIDGE_FREESTANDING,
          fridgeFreestandingType: formData.fridgeFreestandingType ?? 'TWO_DOORS' };
      case KitchenCabinetType.TALL_CABINET:
        return { ...base, type: KitchenCabinetType.TALL_CABINET,
          segments: formData.segments };
      case KitchenCabinetType.CORNER_CABINET:
        return { ...base,
          width: formData.cornerWidthA ?? formData.width, // główna szerokość narożnej
          type: KitchenCabinetType.CORNER_CABINET,
          cornerWidthA: formData.cornerWidthA ?? formData.width,
          cornerWidthB: formData.cornerWidthB,
          cornerMechanism: formData.cornerMechanism!,
          cornerShelfQuantity: formData.cornerShelfQuantity,
          isUpperCorner: formData.isUpperCorner ?? false,
          cornerOpeningType: formData.cornerOpeningType,
          cornerFrontUchylnyWidthMm: formData.cornerFrontUchylnyWidthMm };
      case KitchenCabinetType.UPPER_ONE_DOOR:
        return { ...base, type: KitchenCabinetType.UPPER_ONE_DOOR,
          isLiftUp: formData.isLiftUp ?? false,
          isFrontExtended: formData.isFrontExtended ?? false };
      case KitchenCabinetType.UPPER_TWO_DOOR:
        return { ...base, type: KitchenCabinetType.UPPER_TWO_DOOR,
          isLiftUp: formData.isLiftUp ?? false,
          isFrontExtended: formData.isFrontExtended ?? false };
      case KitchenCabinetType.UPPER_OPEN_SHELF:
        return { ...base, type: KitchenCabinetType.UPPER_OPEN_SHELF };
      case KitchenCabinetType.UPPER_CASCADE:
        return { ...base, type: KitchenCabinetType.UPPER_CASCADE,
          cascadeLowerHeight: formData.cascadeLowerHeight ?? 400,
          cascadeLowerDepth: formData.cascadeLowerDepth ?? 400,
          cascadeUpperHeight: formData.cascadeUpperHeight ?? 320,
          cascadeUpperDepth: formData.cascadeUpperDepth ?? 300,
          cascadeLowerIsLiftUp: formData.cascadeLowerIsLiftUp ?? false,
          cascadeLowerIsFrontExtended: formData.cascadeLowerIsFrontExtended ?? false,
          cascadeUpperIsLiftUp: formData.cascadeUpperIsLiftUp ?? false };
      case KitchenCabinetType.UPPER_HOOD:
        return { ...base, type: KitchenCabinetType.UPPER_HOOD,
          hoodFrontType: formData.hoodFrontType ?? 'FLAP',
          hoodScreenEnabled: formData.hoodScreenEnabled ?? false,
          hoodScreenHeightMm: formData.hoodScreenHeightMm ?? 100 };
      case KitchenCabinetType.UPPER_DRAINER:
        return { ...base, type: KitchenCabinetType.UPPER_DRAINER,
          drainerFrontType: formData.drainerFrontType ?? 'OPEN' };
      default:
        // Exhaustive check — TypeScript zasygnalizuje błąd gdy brakuje case'u
        const _exhaustive: never = formData.kitchenCabinetType;
        throw new Error(`Nieobsługiwany typ szafki: ${_exhaustive}`);
    }
  }

  removeCabinet(cabinetId: string): void {
    this._walls.update(walls =>
      walls.map(wall => ({
        ...wall,
        cabinets: wall.cabinets.filter(cab => cab.id !== cabinetId)
      }))
    );
  }

  cloneCabinet(cabinetId: string): void {
    const selectedWallId = this._selectedWallId();
    this._walls.update(walls =>
      walls.map(wall => {
        if (wall.id !== selectedWallId) return wall;
        const source = wall.cabinets.find(cab => cab.id === cabinetId);
        if (!source) return wall;
        const clone: KitchenCabinet = {
          ...structuredClone(source),
          id: this.generateCabinetId()
        };
        return { ...wall, cabinets: [...wall.cabinets, clone] };
      })
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
    const updatedCabinet = this.buildCabinetFromFormData(formData, cabinetId, calculatedResult);
    this._walls.update(walls =>
      walls.map(wall => ({
        ...wall,
        cabinets: wall.cabinets.map(cab => cab.id !== cabinetId ? cab : updatedCabinet)
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
    // Nowy projekt dziedziczy globalne defaults (z user_settings DB), nie hardcoded wartości
    this._walls.set([
      {
        id: 'wall-1',
        type: 'MAIN',
        widthMm: 3600,
        heightMm: 2600,
        cabinets: [],
        countertopConfig: {
          enabled: true,
          materialType: 'LAMINATE',
          thicknessMm: this._globalDefaultCountertopThicknessMm,
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
    this._selectedWallId.set('wall-1');
    this._wallIdCounter = 1;
    this._cabinetIdCounter = 0;
    this._currentProjectId.set(null);
    this._currentProjectName.set(null);
    this._currentProjectDescription.set(null);
    this._currentProjectClientName.set(null);
    this._currentProjectClientPhone.set(null);
    this._currentProjectClientEmail.set(null);
    this._currentProjectVersion.set(0);
    this._currentProjectStatus.set('DRAFT');
    this._currentProjectAllowedTransitions.set([]);

    // Reset ustawień projektu do globalnych defaults (z user_settings DB)
    this._plinthHeightMm.set(this._globalDefaultPlinthHeightMm);
    this._countertopThicknessMm.set(this._globalDefaultCountertopThicknessMm);
    this._upperFillerHeightMm.set(this._globalDefaultUpperFillerHeightMm);
  }

  // ============ PROJECT LOAD/SAVE ============

  /**
   * Wczytuje projekt z backendu do stanu aplikacji.
   */
  loadProject(project: KitchenProjectDetailResponse): void {
    // Reset stanu
    this._wallIdCounter = 0;
    this._cabinetIdCounter = 0;

    // Konwertuj ściany z response na WallWithCabinets
    const walls: WallWithCabinets[] = project.walls.map(wallResp => {
      this._wallIdCounter++;
      const wallId = `wall-${this._wallIdCounter}`;

      // Konwertuj szafki
      const cabinets: KitchenCabinet[] = wallResp.cabinets.map(cabResp => {
        this._cabinetIdCounter++;

        // Dla szafki narożnej: width = cornerWidthA (główna szerokość)
        const isCorner = cabResp.cabinetType === KitchenCabinetType.CORNER_CABINET;
        const effectiveWidth = isCorner && cabResp.cornerWidthA
          ? cabResp.cornerWidthA
          : cabResp.widthMm;

        // Mapuj segmenty (dla TALL_CABINET i BASE_FRIDGE)
        let segments: SegmentFormData[] | undefined;
        if (cabResp.segments && cabResp.segments.length > 0) {
          segments = cabResp.segments.map((seg: any) => this.mapSegmentResponseToFormData(seg));
        }

        const baseFromResp: KitchenCabinetBase = {
          id: cabResp.cabinetId || `cabinet-${this._cabinetIdCounter}`,
          name: cabResp.cabinetId,
          openingType: (cabResp.openingType ?? 'LEFT') as OpeningType,
          width: effectiveWidth,
          height: cabResp.heightMm,
          depth: cabResp.depthMm,
          positionY: cabResp.positionY ?? 0,
          shelfQuantity: cabResp.shelfQuantity ?? 1,
          positioningMode: cabResp.positioningMode,
          gapFromCountertopMm: cabResp.gapFromCountertopMm,
          leftEnclosureType: cabResp.leftEnclosure?.type,
          rightEnclosureType: cabResp.rightEnclosure?.type,
          leftSupportPlate: cabResp.leftEnclosure?.supportPlate,
          rightSupportPlate: cabResp.rightEnclosure?.supportPlate,
          leftFillerWidthOverrideMm: cabResp.leftEnclosure?.fillerWidthOverrideMm,
          rightFillerWidthOverrideMm: cabResp.rightEnclosure?.fillerWidthOverrideMm,
          distanceFromWallMm: cabResp.distanceFromWallMm,
          bottomWreathOnFloor: cabResp.bottomWreathOnFloor ?? false,
          calculatedResult: {
            totalCost: cabResp.totalCost,
            boardCosts: cabResp.boardsCost,
            componentCosts: cabResp.componentsCost,
            jobCosts: cabResp.jobsCost
          }
        };

        // Twórz poprawnie typowany KitchenCabinet per typ — pola type-specific odczytane
        // z API response (jeśli backend je zwraca) lub ustawione na sensowne defaults.
        // Uwaga: backend obecnie nie persystuje wszystkich pól type-specific (np. sinkFrontType).
        // TODO: rozszerzyć ProjectCabinetResponse o brakujące pola type-specific.
        const cabinetType: KitchenCabinetType = cabResp.cabinetType;
        switch (cabinetType) {
          case KitchenCabinetType.BASE_ONE_DOOR:
            return { ...baseFromResp, type: KitchenCabinetType.BASE_ONE_DOOR };
          case KitchenCabinetType.BASE_TWO_DOOR:
            return { ...baseFromResp, type: KitchenCabinetType.BASE_TWO_DOOR };
          case KitchenCabinetType.BASE_WITH_DRAWERS:
            return { ...baseFromResp, type: KitchenCabinetType.BASE_WITH_DRAWERS,
              drawerQuantity: cabResp.drawerQuantity ?? 3,
              drawerModel: cabResp.drawerModel ?? 'ANTARO_TANDEMBOX' };
          case KitchenCabinetType.BASE_SINK:
            return { ...baseFromResp, type: KitchenCabinetType.BASE_SINK,
              sinkFrontType: cabResp.sinkFrontType ?? 'ONE_DOOR',
              sinkApronEnabled: cabResp.sinkApronEnabled ?? true,
              sinkApronHeightMm: cabResp.sinkApronHeightMm ?? 150,
              sinkDrawerModel: cabResp.drawerModel };
          case KitchenCabinetType.BASE_COOKTOP:
            return { ...baseFromResp, type: KitchenCabinetType.BASE_COOKTOP,
              cooktopType: cabResp.cooktopType ?? 'INDUCTION',
              cooktopFrontType: cabResp.cooktopFrontType ?? 'DRAWERS',
              drawerQuantity: cabResp.drawerQuantity,
              drawerModel: cabResp.drawerModel };
          case KitchenCabinetType.BASE_DISHWASHER:
            return { ...baseFromResp, type: KitchenCabinetType.BASE_DISHWASHER };
          case KitchenCabinetType.BASE_DISHWASHER_FREESTANDING:
            return { ...baseFromResp, type: KitchenCabinetType.BASE_DISHWASHER_FREESTANDING };
          case KitchenCabinetType.BASE_OVEN:
            return { ...baseFromResp, type: KitchenCabinetType.BASE_OVEN,
              ovenHeightType: cabResp.ovenHeightType ?? 'STANDARD',
              ovenLowerSectionType: cabResp.ovenLowerSectionType ?? 'LOW_DRAWER',
              ovenApronEnabled: cabResp.ovenApronEnabled ?? false,
              ovenApronHeightMm: cabResp.ovenApronHeightMm ?? 60,
              drawerModel: cabResp.drawerModel };
          case KitchenCabinetType.BASE_OVEN_FREESTANDING:
            return { ...baseFromResp, type: KitchenCabinetType.BASE_OVEN_FREESTANDING };
          case KitchenCabinetType.BASE_FRIDGE:
            return { ...baseFromResp, type: KitchenCabinetType.BASE_FRIDGE,
              fridgeSectionType: cabResp.fridgeSectionType ?? 'TWO_DOORS',
              lowerFrontHeightMm: cabResp.lowerFrontHeightMm ?? 713,
              segments };
          case KitchenCabinetType.BASE_FRIDGE_FREESTANDING:
            return { ...baseFromResp, type: KitchenCabinetType.BASE_FRIDGE_FREESTANDING,
              fridgeFreestandingType: cabResp.fridgeFreestandingType ?? 'TWO_DOORS' };
          case KitchenCabinetType.TALL_CABINET:
            return { ...baseFromResp, type: KitchenCabinetType.TALL_CABINET, segments };
          case KitchenCabinetType.CORNER_CABINET:
            return { ...baseFromResp,
              width: cabResp.cornerWidthA ?? effectiveWidth,
              type: KitchenCabinetType.CORNER_CABINET,
              cornerWidthA: cabResp.cornerWidthA ?? effectiveWidth,
              cornerWidthB: cabResp.cornerWidthB,
              cornerMechanism: (cabResp.cornerMechanism as CornerMechanismType) ?? 'FIXED_SHELVES',
              cornerShelfQuantity: cabResp.cornerShelfQuantity,
              isUpperCorner: cabResp.isUpperCorner ?? false,
              cornerOpeningType: cabResp.cornerOpeningType,
              cornerFrontUchylnyWidthMm: cabResp.cornerFrontUchylnyWidthMm };
          case KitchenCabinetType.UPPER_ONE_DOOR:
            return { ...baseFromResp, type: KitchenCabinetType.UPPER_ONE_DOOR,
              isLiftUp: cabResp.isLiftUp ?? false,
              isFrontExtended: cabResp.isFrontExtended ?? false };
          case KitchenCabinetType.UPPER_TWO_DOOR:
            return { ...baseFromResp, type: KitchenCabinetType.UPPER_TWO_DOOR,
              isLiftUp: cabResp.isLiftUp ?? false,
              isFrontExtended: cabResp.isFrontExtended ?? false };
          case KitchenCabinetType.UPPER_OPEN_SHELF:
            return { ...baseFromResp, type: KitchenCabinetType.UPPER_OPEN_SHELF };
          case KitchenCabinetType.UPPER_CASCADE: {
            const lower = cabResp.cascadeSegments?.find(s => s.orderIndex === 0);
            const upper = cabResp.cascadeSegments?.find(s => s.orderIndex === 1);
            return { ...baseFromResp, type: KitchenCabinetType.UPPER_CASCADE,
              cascadeLowerHeight: lower?.height ?? 400,
              cascadeLowerDepth: lower?.depth ?? 400,
              cascadeUpperHeight: upper?.height ?? 320,
              cascadeUpperDepth: upper?.depth ?? 300,
              cascadeLowerIsLiftUp: lower?.isLiftUp ?? false,
              cascadeLowerIsFrontExtended: lower?.isFrontExtended ?? false,
              cascadeUpperIsLiftUp: upper?.isLiftUp ?? false };
          }
          case KitchenCabinetType.UPPER_HOOD:
            return { ...baseFromResp, type: KitchenCabinetType.UPPER_HOOD,
              hoodFrontType: cabResp.hoodFrontType ?? 'FLAP',
              hoodScreenEnabled: cabResp.hoodScreenEnabled ?? false,
              hoodScreenHeightMm: cabResp.hoodScreenHeightMm ?? 100 };
          case KitchenCabinetType.UPPER_DRAINER:
            return { ...baseFromResp, type: KitchenCabinetType.UPPER_DRAINER,
              drainerFrontType: cabResp.drainerFrontType ?? 'OPEN' };
          default:
            // Fallback dla nieznanych typów z przyszłych wersji backendu
            return { ...baseFromResp, type: cabinetType } as KitchenCabinet;
        }
      });

      // Wczytaj konfigurację blatu z response (CountertopResponse)
      let countertopConfig: CountertopConfig | undefined;
      if (wallResp.countertop && wallResp.countertop.enabled) {
        countertopConfig = {
          enabled: true,
          materialType: wallResp.countertop.materialType,
          thicknessMm: wallResp.countertop.thicknessMm,
          // Przywróć głębokość z response (jest to wartość użyta w ostatnim obliczeniu)
          manualDepthMm: wallResp.countertop.depthMm ?? 600,
          sideOverhangExtraMm: 5  // domyślne — nie jest przechowywane w backend response
          // jointType i edgeType można by też odczytać z segmentów jeśli potrzebne
        };
      }

      // Wczytaj konfigurację cokołu z response (PlinthResponse)
      let plinthConfig: PlinthConfig | undefined;
      if (wallResp.plinth && wallResp.plinth.enabled) {
        plinthConfig = {
          enabled: true,
          feetType: wallResp.plinth.feetType,
          materialType: wallResp.plinth.materialType
        };
      }

      return {
        id: wallId,
        type: wallResp.wallType,
        widthMm: wallResp.widthMm,
        heightMm: wallResp.heightMm,
        cabinets,
        countertopConfig,
        plinthConfig
      };
    });

    // Jeśli brak ścian, dodaj domyślną
    if (walls.length === 0) {
      this._wallIdCounter++;
      walls.push({
        id: `wall-${this._wallIdCounter}`,
        type: 'MAIN',
        widthMm: 3600,
        heightMm: 2600,
        cabinets: []
      });
    }

    // Ustaw stan
    this._walls.set(walls);
    this._selectedWallId.set(walls[0].id);
    this._currentProjectId.set(project.id);
    this._currentProjectName.set(project.name);
    this._currentProjectDescription.set(project.description ?? null);
    this._currentProjectClientName.set(project.clientName ?? null);
    this._currentProjectClientPhone.set(project.clientPhone ?? null);
    this._currentProjectClientEmail.set(project.clientEmail ?? null);
    this._currentProjectVersion.set(project.version);
    this._currentProjectStatus.set(project.status);
    this._currentProjectAllowedTransitions.set(project.allowedTransitions ?? []);

    // Wczytaj ustawienia projektu (z wartościami domyślnymi jako fallback)
    this._plinthHeightMm.set(project.plinthHeightMm ?? 100);
    this._countertopThicknessMm.set(project.countertopThicknessMm ?? 38);
    this._upperFillerHeightMm.set(project.upperFillerHeightMm ?? 100);
  }

  /**
   * Buduje request do aktualizacji istniejącego projektu.
   */
  buildUpdateProjectRequest(name?: string, description?: string, clientName?: string, clientPhone?: string, clientEmail?: string): UpdateKitchenProjectRequest {
    return {
      name: name ?? this._currentProjectName() ?? 'Bez nazwy',
      description,
      clientName,
      clientPhone,
      clientEmail,
      walls: this.buildProjectWalls(),
      plinthHeightMm: this._plinthHeightMm(),
      countertopThicknessMm: this._countertopThicknessMm(),
      upperFillerHeightMm: this._upperFillerHeightMm()
    };
  }

  /**
   * Ustawia ID aktualnego projektu po zapisie.
   */
  setProjectInfo(projectId: number, projectName: string, version: number, description?: string, status?: ProjectStatus, allowedTransitions?: ProjectStatus[], clientName?: string, clientPhone?: string, clientEmail?: string): void {
    this._currentProjectId.set(projectId);
    this._currentProjectName.set(projectName);
    this._currentProjectDescription.set(description ?? null);
    this._currentProjectClientName.set(clientName ?? null);
    this._currentProjectClientPhone.set(clientPhone ?? null);
    this._currentProjectClientEmail.set(clientEmail ?? null);
    this._currentProjectVersion.set(version);
    if (status) {
      this._currentProjectStatus.set(status);
    }
    if (allowedTransitions) {
      this._currentProjectAllowedTransitions.set(allowedTransitions);
    }
  }

  /**
   * Sprawdza czy aktualnie pracujemy nad zapisanym projektem.
   */
  hasUnsavedProject(): boolean {
    return this._currentProjectId() === null && this.totalCabinetCount() > 0;
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
  buildMultiWallProjectRequest(name: string, description?: string, clientName?: string, clientPhone?: string, clientEmail?: string): CreateKitchenProjectRequest {
    return {
      name,
      description,
      clientName,
      clientPhone,
      clientEmail,
      walls: this.buildProjectWalls(),
      plinthHeightMm: this._plinthHeightMm(),
      countertopThicknessMm: this._countertopThicknessMm(),
      upperFillerHeightMm: this._upperFillerHeightMm()
    };
  }

  /**
   * Delegates to ProjectRequestBuilderService — pure data mapping.
   */
  private buildProjectWalls(): ProjectWallRequest[] {
    return this.requestBuilder.buildProjectWalls(this._walls(), {
      plinthHeightMm: this._plinthHeightMm(),
      countertopThicknessMm: this._countertopThicknessMm(),
      upperFillerHeightMm: this._upperFillerHeightMm(),
      fillerWidthMm: this._fillerWidthMm()
    });
  }

  // ============ PRIVATE HELPERS (delegates to ProjectRequestBuilderService) ============

  private enclosureOuterWidthMm(cab: KitchenCabinet, side: 'left' | 'right'): number {
    return this.requestBuilder.enclosureOuterWidthMm(cab, side, this._fillerWidthMm());
  }

  private mapCalculationResult(result: any): CabinetCalculationResult | undefined {
    return this.requestBuilder.mapCalculationResult(result);
  }

  private mapSegmentResponseToFormData(seg: any): SegmentFormData {
    return this.requestBuilder.mapSegmentResponseToFormData(seg);
  }
}
