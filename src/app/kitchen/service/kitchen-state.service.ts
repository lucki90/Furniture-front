import { Injectable, signal, computed } from '@angular/core';
import {
  KitchenCabinet,
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
  DrawerRequest,
  CornerCabinetRequest,
  CascadeSegmentRequest,
  KitchenProjectDetailResponse,
  UpdateKitchenProjectRequest,
  ProjectStatus
} from '../model/kitchen-project.model';
import { CountertopRequest, DEFAULT_COUNTERTOP_REQUEST } from '../model/countertop.model';
import { PlinthRequest, DEFAULT_PLINTH_REQUEST } from '../model/plinth.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { mapSegmentToRequest, SegmentRequest, SegmentFormData, SegmentType, SegmentFrontType } from '../cabinet-form/model/segment.model';
import { CornerMechanismType } from '../cabinet-form/model/corner-cabinet.model';
import { EnclosureConfig, EnclosureType } from '../cabinet-form/model/enclosure.model';

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
    // Dla szafki narożnej: width = cornerWidthA (główna szerokość)
    const isCorner = formData.kitchenCabinetType === KitchenCabinetType.CORNER_CABINET;
    const effectiveWidth = isCorner ? (formData.cornerWidthA ?? formData.width) : formData.width;

    const newCabinet: KitchenCabinet = {
      id: this.generateCabinetId(),
      name: formData.name,
      type: formData.kitchenCabinetType,
      openingType: formData.openingType,
      width: effectiveWidth,
      height: formData.height,
      depth: formData.depth,
      positionY: formData.positionY ?? 0,
      shelfQuantity: formData.shelfQuantity,
      drawerQuantity: formData.drawerQuantity,
      drawerModel: formData.drawerModel ?? undefined,
      segments: formData.segments,  // dla TALL_CABINET

      // Pola kaskadowe (dla UPPER_CASCADE)
      cascadeLowerHeight: formData.cascadeLowerHeight,
      cascadeLowerDepth: formData.cascadeLowerDepth,
      cascadeUpperHeight: formData.cascadeUpperHeight,
      cascadeUpperDepth: formData.cascadeUpperDepth,
      cascadeLowerIsLiftUp: formData.cascadeLowerIsLiftUp ?? false,
      cascadeLowerIsFrontExtended: formData.cascadeLowerIsFrontExtended ?? false,
      cascadeUpperIsLiftUp: formData.cascadeUpperIsLiftUp ?? false,

      // Pola dla szafki narożnej (CORNER_CABINET)
      cornerWidthA: isCorner ? formData.cornerWidthA : undefined,
      cornerWidthB: isCorner ? formData.cornerWidthB : undefined,
      cornerMechanism: isCorner ? formData.cornerMechanism : undefined,
      cornerShelfQuantity: isCorner ? formData.cornerShelfQuantity : undefined,
      isUpperCorner: isCorner ? formData.isUpperCorner : undefined,
      cornerOpeningType: isCorner ? formData.cornerOpeningType : undefined,
      cornerFrontUchylnyWidthMm: isCorner ? formData.cornerFrontUchylnyWidthMm : undefined,

      // Pozycjonowanie szafek wiszących
      positioningMode: formData.positioningMode,
      gapFromCountertopMm: formData.gapFromCountertopMm,

      // Obudowa boczna
      leftEnclosureType: formData.leftEnclosureType,
      rightEnclosureType: formData.rightEnclosureType,
      leftSupportPlate: formData.leftSupportPlate,
      rightSupportPlate: formData.rightSupportPlate,
      distanceFromWallMm: formData.distanceFromWallMm,
      leftFillerWidthOverrideMm: formData.leftFillerWidthOverrideMm,
      rightFillerWidthOverrideMm: formData.rightFillerWidthOverrideMm,

      // Nowy sposób liczenia dolnych
      bottomWreathOnFloor: formData.bottomWreathOnFloor ?? false,

      // Pola szafki zlewowej (BASE_SINK)
      sinkFrontType: formData.sinkFrontType,
      sinkApronEnabled: (formData as any).sinkApronEnabled ?? true,
      sinkApronHeightMm: (formData as any).sinkApronHeightMm ?? 150,
      sinkDrawerModel: (formData as any).sinkDrawerModel,

      // Pola szafki pod płytę grzewczą (BASE_COOKTOP)
      cooktopType: (formData as any).cooktopType ?? 'INDUCTION',
      cooktopFrontType: (formData as any).cooktopFrontType ?? 'DRAWERS',

      // Pola szafki wiszącej na okap (UPPER_HOOD)
      hoodFrontType: (formData as any).hoodFrontType ?? 'FLAP',
      hoodScreenEnabled: (formData as any).hoodScreenEnabled ?? false,
      hoodScreenHeightMm: (formData as any).hoodScreenHeightMm ?? 100,

      // Pola szafki na piekarnik (BASE_OVEN)
      ovenHeightType: (formData as any).ovenHeightType ?? 'STANDARD',
      ovenLowerSectionType: (formData as any).ovenLowerSectionType ?? 'LOW_DRAWER',
      ovenApronEnabled: (formData as any).ovenApronEnabled ?? false,
      ovenApronHeightMm: (formData as any).ovenApronHeightMm ?? 60,

      // Pola szafki na lodówkę (BASE_FRIDGE)
      fridgeSectionType: (formData as any).fridgeSectionType ?? 'TWO_DOORS',
      lowerFrontHeightMm: (formData as any).lowerFrontHeightMm ?? 713,

      // Pola lodówki wolnostojącej (BASE_FRIDGE_FREESTANDING)
      fridgeFreestandingType: (formData as any).fridgeFreestandingType ?? 'TWO_DOORS',

      // Pola szafek wiszących (UPPER_ONE_DOOR, UPPER_TWO_DOOR)
      isLiftUp: (formData as any).isLiftUp ?? false,
      isFrontExtended: (formData as any).isFrontExtended ?? false,

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

          // Dla szafki narożnej: width = cornerWidthA (główna szerokość)
          const isCorner = formData.kitchenCabinetType === KitchenCabinetType.CORNER_CABINET;
          const effectiveWidth = isCorner ? (formData.cornerWidthA ?? formData.width) : formData.width;

          return {
            ...cab,
            name: formData.name,
            type: formData.kitchenCabinetType,
            openingType: formData.openingType,
            width: effectiveWidth,
            height: formData.height,
            depth: formData.depth,
            positionY: formData.positionY ?? 0,
            shelfQuantity: formData.shelfQuantity,
            drawerQuantity: formData.drawerQuantity,
            drawerModel: formData.drawerModel ?? undefined,
            segments: formData.segments,  // dla TALL_CABINET

            // Pola kaskadowe (dla UPPER_CASCADE)
            cascadeLowerHeight: formData.cascadeLowerHeight,
            cascadeLowerDepth: formData.cascadeLowerDepth,
            cascadeUpperHeight: formData.cascadeUpperHeight,
            cascadeUpperDepth: formData.cascadeUpperDepth,

            // Pola dla szafki narożnej (CORNER_CABINET)
            cornerWidthA: isCorner ? formData.cornerWidthA : undefined,
            cornerWidthB: isCorner ? formData.cornerWidthB : undefined,
            cornerMechanism: isCorner ? formData.cornerMechanism : undefined,
            cornerShelfQuantity: isCorner ? formData.cornerShelfQuantity : undefined,
            isUpperCorner: isCorner ? formData.isUpperCorner : undefined,
            cornerOpeningType: isCorner ? formData.cornerOpeningType : undefined,
            cornerFrontUchylnyWidthMm: isCorner ? formData.cornerFrontUchylnyWidthMm : undefined,

            // Pozycjonowanie szafek wiszących
            positioningMode: formData.positioningMode,
            gapFromCountertopMm: formData.gapFromCountertopMm,

            // Obudowa boczna
            leftEnclosureType: formData.leftEnclosureType,
            rightEnclosureType: formData.rightEnclosureType,
            leftSupportPlate: formData.leftSupportPlate,
            rightSupportPlate: formData.rightSupportPlate,
            distanceFromWallMm: formData.distanceFromWallMm,
            leftFillerWidthOverrideMm: formData.leftFillerWidthOverrideMm,
            rightFillerWidthOverrideMm: formData.rightFillerWidthOverrideMm,

            // Nowy sposób liczenia dolnych
            bottomWreathOnFloor: formData.bottomWreathOnFloor ?? false,

            // Pola szafki zlewowej (BASE_SINK)
            sinkFrontType: (formData as any).sinkFrontType,
            sinkApronEnabled: (formData as any).sinkApronEnabled ?? true,
            sinkApronHeightMm: (formData as any).sinkApronHeightMm ?? 150,
            sinkDrawerModel: (formData as any).sinkDrawerModel,

            // Pola szafki pod płytę grzewczą (BASE_COOKTOP)
            cooktopType: (formData as any).cooktopType ?? 'INDUCTION',
            cooktopFrontType: (formData as any).cooktopFrontType ?? 'DRAWERS',

            // Pola szafki wiszącej na okap (UPPER_HOOD)
            hoodFrontType: (formData as any).hoodFrontType ?? 'FLAP',
            hoodScreenEnabled: (formData as any).hoodScreenEnabled ?? false,
            hoodScreenHeightMm: (formData as any).hoodScreenHeightMm ?? 100,

            // Pola szafki na piekarnik (BASE_OVEN)
            ovenHeightType: (formData as any).ovenHeightType ?? 'STANDARD',
            ovenLowerSectionType: (formData as any).ovenLowerSectionType ?? 'LOW_DRAWER',
            ovenApronEnabled: (formData as any).ovenApronEnabled ?? false,
            ovenApronHeightMm: (formData as any).ovenApronHeightMm ?? 60,

            // Pola szafki na lodówkę (BASE_FRIDGE)
            fridgeSectionType: (formData as any).fridgeSectionType ?? 'TWO_DOORS',
            lowerFrontHeightMm: (formData as any).lowerFrontHeightMm ?? 713,

            // Pola lodówki wolnostojącej (BASE_FRIDGE_FREESTANDING)
            fridgeFreestandingType: (formData as any).fridgeFreestandingType ?? 'TWO_DOORS',

            // Pola szafek wiszących (UPPER_ONE_DOOR, UPPER_TWO_DOOR)
            isLiftUp: (formData as any).isLiftUp ?? false,
            isFrontExtended: (formData as any).isFrontExtended ?? false,

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

        // Mapuj segmenty (dla TALL_CABINET)
        let segments: SegmentFormData[] | undefined;
        if (cabResp.segments && cabResp.segments.length > 0) {
          segments = cabResp.segments.map(seg => this.mapSegmentResponseToFormData(seg));
        }

        return {
          id: cabResp.cabinetId || `cabinet-${this._cabinetIdCounter}`,
          name: cabResp.cabinetId,
          type: cabResp.cabinetType,
          openingType: cabResp.openingType as any ?? 'LEFT',
          width: effectiveWidth,
          height: cabResp.heightMm,
          depth: cabResp.depthMm,
          positionY: cabResp.positionY ?? 0,
          shelfQuantity: cabResp.shelfQuantity ?? 1,
          drawerQuantity: cabResp.drawerQuantity,
          drawerModel: cabResp.drawerModel,

          // Segmenty (dla TALL_CABINET)
          segments,

          // Pola dla szafki narożnej (CORNER_CABINET)
          cornerWidthA: cabResp.cornerWidthA,
          cornerWidthB: cabResp.cornerWidthB,
          cornerMechanism: cabResp.cornerMechanism as CornerMechanismType | undefined,
          cornerShelfQuantity: cabResp.cornerShelfQuantity,
          isUpperCorner: cabResp.isUpperCorner,

          // Pozycjonowanie szafek wiszących
          positioningMode: cabResp.positioningMode,
          gapFromCountertopMm: cabResp.gapFromCountertopMm,

          calculatedResult: {
            totalCost: cabResp.totalCost,
            boardCosts: cabResp.boardsCost,
            componentCosts: cabResp.componentsCost,
            jobCosts: cabResp.jobsCost
          }
        };
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
  buildUpdateProjectRequest(name?: string, description?: string): UpdateKitchenProjectRequest {
    return {
      name: name ?? this._currentProjectName() ?? 'Bez nazwy',
      description,
      walls: this.buildProjectWalls(),
      plinthHeightMm: this._plinthHeightMm(),
      countertopThicknessMm: this._countertopThicknessMm(),
      upperFillerHeightMm: this._upperFillerHeightMm()
    };
  }

  /**
   * Ustawia ID aktualnego projektu po zapisie.
   */
  setProjectInfo(projectId: number, projectName: string, version: number, description?: string, status?: ProjectStatus, allowedTransitions?: ProjectStatus[]): void {
    this._currentProjectId.set(projectId);
    this._currentProjectName.set(projectName);
    this._currentProjectDescription.set(description ?? null);
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
  buildMultiWallProjectRequest(name: string, description?: string): CreateKitchenProjectRequest {
    return {
      name,
      description,
      walls: this.buildProjectWalls(),
      plinthHeightMm: this._plinthHeightMm(),
      countertopThicknessMm: this._countertopThicknessMm(),
      upperFillerHeightMm: this._upperFillerHeightMm()
    };
  }

  /**
   * Helper: buduje listę ścian z szafkami dla requestów.
   */
  private buildProjectWalls(): ProjectWallRequest[] {
    const walls = this._walls();

    return walls.map(wall => {
      // Osobne liczniki X dla strefy dolnej (BOTTOM + FULL) i górnej (TOP).
      // Szafki wiszące startują od X=0 niezależnie od szafek dolnych — inaczej
      // walidacja zgłasza błąd przekroczenia szerokości ściany.
      let currentXBottom = 0;
      let currentXTop = 0;

      // Oblicz positionY dla szafek wiszących (tak samo jak cabinetPositions() dla SVG).
      // positionY musi być poprawne, bo PlacementValidator sprawdza nakładanie w osi Y.
      const wallPlinthH = this._plinthHeightMm();
      const wallCountertopThickness = this._countertopThicknessMm();
      const wallUpperFillerH = this._upperFillerHeightMm();
      const wallH = wall.heightMm;
      // Tylko szafki z blatem (requiresCountertop) — wyklucza TALL, BASE_FRIDGE, wolnostojące AGD (T1 fix)
      const bottomCabsInWall = wall.cabinets.filter(c => requiresCountertop(c.type));
      const maxBaseCorpusH = bottomCabsInWall.length > 0
        ? Math.max(...bottomCabsInWall.map(c => c.height))
        : 720;
      const countertopH = wallPlinthH + maxBaseCorpusH + wallCountertopThickness;

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
        // BASE_SINK z typem frontu DRAWER — przekazujemy drawer request z 1 szufladą
        if (cab.type === KitchenCabinetType.BASE_SINK && (cab as any).sinkFrontType === 'DRAWER') {
          drawerRequest = {
            drawerQuantity: 1,
            drawerModel: (cab as any).sinkDrawerModel ?? 'ANTARO_TANDEMBOX',
            drawerBaseHdf: false,
            drawerFrontDetails: null
          };
        }
        // BASE_COOKTOP z typem frontu DRAWERS — przekazujemy drawer request
        if (cab.type === KitchenCabinetType.BASE_COOKTOP && (cab as any).cooktopFrontType === 'DRAWERS') {
          drawerRequest = {
            drawerQuantity: cab.drawerQuantity ?? 3,
            drawerModel: cab.drawerModel ?? 'ANTARO_TANDEMBOX',
            drawerBaseHdf: false,
            drawerFrontDetails: null
          };
        }
        // BASE_OVEN z szufladą niską (LOW_DRAWER) — wyślij model prowadnicy do backendu
        // drawerQuantity: 1 żeby przejść walidację @Min(1); backend ignoruje ilość dla tacy
        // Warunek: tylko gdy drawerModel jest ustawiony — dla HINGED_DOOR/NONE drawerModel=null
        if (cab.type === KitchenCabinetType.BASE_OVEN && cab.drawerModel) {
          drawerRequest = {
            drawerQuantity: 1,
            drawerModel: cab.drawerModel,
            drawerBaseHdf: false,
            drawerFrontDetails: null
          };
        }

        // Przygotuj segmenty dla TALL_CABINET i BASE_FRIDGE (sekcje nad lodówką)
        let segments: SegmentRequest[] | undefined;
        const needsSegments = hasSegments(cab.type);
        if (needsSegments && cab.segments && cab.segments.length > 0) {
          segments = cab.segments.map((segment, index) => {
            const segmentWithIndex: SegmentFormData = {
              ...segment,
              orderIndex: index
            };
            return mapSegmentToRequest(segmentWithIndex);
          });
        }

        // Przygotuj cascadeSegments dla UPPER_CASCADE
        let cascadeSegments: CascadeSegmentRequest[] | undefined;
        if (cab.type === KitchenCabinetType.UPPER_CASCADE &&
            cab.cascadeLowerHeight && cab.cascadeLowerDepth &&
            cab.cascadeUpperHeight && cab.cascadeUpperDepth) {
          const lowerLiftUp = cab.cascadeLowerIsLiftUp ?? false;
          const upperLiftUp = cab.cascadeUpperIsLiftUp ?? false;
          cascadeSegments = [
            {
              orderIndex: 0, height: cab.cascadeLowerHeight, depth: cab.cascadeLowerDepth,
              frontType: lowerLiftUp ? 'UPWARDS' : 'ONE_DOOR', shelfQuantity: 0,
              isLiftUp: lowerLiftUp, isFrontExtended: cab.cascadeLowerIsFrontExtended ?? false
            },
            {
              orderIndex: 1, height: cab.cascadeUpperHeight, depth: cab.cascadeUpperDepth,
              frontType: upperLiftUp ? 'UPWARDS' : 'ONE_DOOR', shelfQuantity: 0,
              isLiftUp: upperLiftUp, isFrontExtended: false
            }
          ];
        }

        // Przygotuj cornerRequest dla CORNER_CABINET
        let cornerRequest: CornerCabinetRequest | undefined;
        if (cab.type === KitchenCabinetType.CORNER_CABINET && cab.cornerWidthA && cab.cornerMechanism) {
          cornerRequest = {
            widthA: cab.cornerWidthA,
            widthB: cab.cornerWidthB ?? null,
            mechanism: cab.cornerMechanism,
            shelfQuantity: cab.cornerShelfQuantity,
            upperCabinet: cab.isUpperCorner ?? false,
            cornerOpeningType: cab.cornerOpeningType,
            frontUchylnyWidthMm: cab.cornerFrontUchylnyWidthMm
          };
        }

        // Oblicz positionX osobno dla strefy dolnej i górnej — z uwzględnieniem enclosureWidths
        const isTop = isUpperCabinetType(cab.type);
        const leftEncW = this.enclosureOuterWidthMm(cab, 'left');
        const rightEncW = this.enclosureOuterWidthMm(cab, 'right');
        let posX: number;
        if (isTop) {
          posX = currentXTop + leftEncW;
          currentXTop = posX + cab.width + rightEncW;
        } else {
          posX = currentXBottom + leftEncW;
          currentXBottom = posX + cab.width + rightEncW;
        }

        // Oblicz positionY: górne szafki mają Y zależny od trybu pozycjonowania;
        // dolne/słupki mają Y=0 (walidator sprawdza nakładanie w osi Y, więc musi być poprawne).
        let computedPosY = 0;
        if (isTop) {
          if (cab.positioningMode === 'RELATIVE_TO_COUNTERTOP') {
            computedPosY = countertopH + (cab.gapFromCountertopMm ?? 500);
          } else {
            // RELATIVE_TO_CEILING (domyślne)
            computedPosY = wallH - wallUpperFillerH - cab.height;
          }
        }

        const request: ProjectCabinetRequest = {
          cabinetId: cab.name || cab.id, // użyj nazwy jeśli jest, inaczej ID
          kitchenCabinetType: cab.type,
          openingType: cab.openingType,
          height: cab.height,
          width: cab.width,
          depth: cab.depth,
          positionX: posX,
          positionY: computedPosY,
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
          drawerRequest,
          segments,
          cascadeSegments,
          cornerRequest,
          positioningMode: cab.positioningMode,
          gapFromCountertopMm: cab.gapFromCountertopMm,

          // Obudowa boczna — wysyłaj tylko jeśli typ nie jest NONE
          leftEnclosure: (cab.leftEnclosureType && cab.leftEnclosureType !== 'NONE')
            ? {
                type: cab.leftEnclosureType as EnclosureType,
                supportPlate: cab.leftSupportPlate ?? false,
                fillerWidthOverrideMm: cab.leftFillerWidthOverrideMm ?? null
              }
            : undefined,
          rightEnclosure: (cab.rightEnclosureType && cab.rightEnclosureType !== 'NONE')
            ? {
                type: cab.rightEnclosureType as EnclosureType,
                supportPlate: cab.rightSupportPlate ?? false,
                fillerWidthOverrideMm: cab.rightFillerWidthOverrideMm ?? null
              }
            : undefined,
          distanceFromWallMm: cab.distanceFromWallMm ?? null,
          bottomWreathOnFloor: cab.bottomWreathOnFloor ?? false,

          // Pola szafki zlewowej (BASE_SINK)
          sinkFrontType: (cab as any).sinkFrontType,
          sinkApronEnabled: (cab as any).sinkApronEnabled ?? true,
          sinkApronHeightMm: (cab as any).sinkApronHeightMm ?? 150,

          // Pola szafki pod płytę grzewczą (BASE_COOKTOP)
          cooktopType: (cab as any).cooktopType,
          cooktopFrontType: (cab as any).cooktopFrontType,

          // Pola szafki wiszącej na okap (UPPER_HOOD)
          hoodFrontType: (cab as any).hoodFrontType,
          hoodScreenEnabled: (cab as any).hoodScreenEnabled ?? false,
          hoodScreenHeightMm: (cab as any).hoodScreenHeightMm ?? 0,

          // Pola szafki na piekarnik (BASE_OVEN)
          ovenHeightType: (cab as any).ovenHeightType,
          ovenLowerSectionType: (cab as any).ovenLowerSectionType,
          ovenApronEnabled: (cab as any).ovenApronEnabled ?? false,
          ovenApronHeightMm: (cab as any).ovenApronHeightMm ?? 0,

          // Pola szafki na lodówkę (BASE_FRIDGE)
          fridgeSectionType: (cab as any).fridgeSectionType,
          lowerFrontHeightMm: (cab as any).lowerFrontHeightMm ?? 0,

          // Pola lodówki wolnostojącej (BASE_FRIDGE_FREESTANDING)
          fridgeFreestandingType: (cab as any).fridgeFreestandingType,

          // Pola szafek wiszących (UPPER_ONE_DOOR, UPPER_TWO_DOOR)
          isLiftUp: (cab as any).isLiftUp ?? false,
          isFrontExtended: (cab as any).isFrontExtended ?? false
        };
        return request;
      });

      // Oblicz czy blendy skrajne powinny rozszerzyć blat (leftOverhang / rightOverhang)
      // Szafki dolne: te które wymagają blatu (requiresCountertop) + wolnostojące AGD (bez blatu, ale w strefie dolnej)
      const bottomCabs = wall.cabinets.filter(c => requiresCountertop(c.type) || isFreestandingAppliance(c.type));
      const leftOverhangMm = bottomCabs.length > 0
        ? this.enclosureOuterWidthMm(bottomCabs[0], 'left') : 0;
      const rightOverhangMm = bottomCabs.length > 0
        ? this.enclosureOuterWidthMm(bottomCabs[bottomCabs.length - 1], 'right') : 0;

      // Buduj konfigurację blatu
      const countertop: CountertopRequest = this.buildCountertopRequest(wall, leftOverhangMm, rightOverhangMm);

      // Buduj konfigurację cokołu
      const plinth: PlinthRequest = this.buildPlinthRequest(wall);

      return {
        wallType: wall.type,
        widthMm: wall.widthMm,
        heightMm: wall.heightMm,
        cabinets,
        countertop,
        plinth
      };
    });
  }

  /**
   * Zwraca szerokość obudowy bocznej dla danej szafki i strony (w mm).
   * Dla PARALLEL_FILLER_STRIP = fillerWidthOverride lub globalFillerWidth.
   * Dla SIDE_PLATE_* = 18mm (grubość płyty).
   * Dla NONE / brak = 0.
   */
  private enclosureOuterWidthMm(cab: KitchenCabinet, side: 'left' | 'right'): number {
    const type = side === 'left' ? cab.leftEnclosureType : cab.rightEnclosureType;
    if (!type || type === 'NONE') return 0;
    if (type === 'PARALLEL_FILLER_STRIP') {
      const override = side === 'left' ? cab.leftFillerWidthOverrideMm : cab.rightFillerWidthOverrideMm;
      return override ?? this._fillerWidthMm();
    }
    return 18; // SIDE_PLATE_WITH_PLINTH | SIDE_PLATE_TO_FLOOR
  }

  /**
   * Buduje CountertopRequest na podstawie konfiguracji ściany.
   */
  private buildCountertopRequest(
    wall: WallWithCabinets,
    leftOverhangMm = 0,
    rightOverhangMm = 0
  ): CountertopRequest {
    const config = wall.countertopConfig;

    if (!config || !config.enabled) {
      return { ...DEFAULT_COUNTERTOP_REQUEST, enabled: false };
    }

    // Użyj jointType i edgeType z konfiguracji lub domyślne
    const jointType = (config.jointType as any) ?? DEFAULT_COUNTERTOP_REQUEST.jointType;
    const edgeType = (config.edgeType as any) ?? DEFAULT_COUNTERTOP_REQUEST.frontEdgeType;

    // Naddatek boczny: per-ściana + domyślny 5mm (poza blendami bocznymi)
    const sideExtra = config.sideOverhangExtraMm ?? 5;

    return {
      enabled: true,
      materialType: (config.materialType as any) ?? DEFAULT_COUNTERTOP_REQUEST.materialType,
      colorCode: config.colorCode,
      thicknessMm: config.thicknessMm ?? DEFAULT_COUNTERTOP_REQUEST.thicknessMm,
      manualLengthMm: config.manualLengthMm,
      // Zawsze wysyłaj głębokość (domyślnie 600mm) — backend używa jej zamiast auto-kalkulacji
      manualDepthMm: config.manualDepthMm ?? 600,
      frontOverhangMm: config.frontOverhangMm ?? DEFAULT_COUNTERTOP_REQUEST.frontOverhangMm,
      backOverhangMm: DEFAULT_COUNTERTOP_REQUEST.backOverhangMm,
      leftOverhangMm: leftOverhangMm + sideExtra,   // blenda lewa + naddatek boczny
      rightOverhangMm: rightOverhangMm + sideExtra, // blenda prawa + naddatek boczny
      jointType,
      frontEdgeType: edgeType,
      leftEdgeType: DEFAULT_COUNTERTOP_REQUEST.leftEdgeType,
      rightEdgeType: DEFAULT_COUNTERTOP_REQUEST.rightEdgeType,
      backEdgeType: DEFAULT_COUNTERTOP_REQUEST.backEdgeType
    };
  }

  /**
   * Buduje PlinthRequest na podstawie konfiguracji ściany.
   */
  private buildPlinthRequest(wall: WallWithCabinets): PlinthRequest {
    const config = wall.plinthConfig;

    if (!config || !config.enabled) {
      return { ...DEFAULT_PLINTH_REQUEST, enabled: false };
    }

    return {
      enabled: true,
      feetType: (config.feetType as any) ?? DEFAULT_PLINTH_REQUEST.feetType,
      materialType: (config.materialType as any) ?? DEFAULT_PLINTH_REQUEST.materialType,
      colorCode: config.colorCode,
      setbackMm: config.setbackMm ?? DEFAULT_PLINTH_REQUEST.setbackMm
    };
  }

  // ============ PRIVATE HELPERS ============

  private mapCalculationResult(result: any): CabinetCalculationResult | undefined {
    if (!result) return undefined;

    // CabinetResponse (/add endpoint) używa: summaryCosts, boardTotalCost, componentTotalCost, jobTotalCost
    // CabinetPlacementResponse (projekt z bazy) używa: totalCost, boardsCost, componentsCost, jobsCost
    // Obsługujemy oba formaty — priorytet: CabinetResponse (świeża kalkulacja)
    return {
      totalCost: result.summaryCosts ?? result.totalCost ?? 0,
      boardCosts: result.boardTotalCost ?? result.boardsCost ?? result.boardCosts ?? 0,
      componentCosts: result.componentTotalCost ?? result.componentsCost ?? result.componentCosts ?? 0,
      jobCosts: result.jobTotalCost ?? result.jobsCost ?? result.jobCosts ?? 0
    };
  }

  /**
   * Mapuje SegmentRequest (z API) na SegmentFormData (dla stanu aplikacji).
   */
  private mapSegmentResponseToFormData(seg: any): SegmentFormData {
    const formData: SegmentFormData = {
      segmentType: seg.segmentType as SegmentType,
      height: seg.height,
      orderIndex: seg.orderIndex
    };

    // Mapuj dane szuflad
    if (seg.drawerRequest) {
      formData.drawerQuantity = seg.drawerRequest.drawerQuantity;
      formData.drawerModel = seg.drawerRequest.drawerModel;
    }

    // Mapuj półki i typ frontu
    if (seg.shelfQuantity !== null && seg.shelfQuantity !== undefined) {
      formData.shelfQuantity = seg.shelfQuantity;
    }
    if (seg.frontType) {
      formData.frontType = seg.frontType as SegmentFrontType;
    }

    return formData;
  }
}
