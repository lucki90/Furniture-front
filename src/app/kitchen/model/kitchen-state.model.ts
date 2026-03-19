import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { OpeningType } from '../cabinet-form/model/kitchen-cabinet-constants';
import { WallType, PositioningMode } from './kitchen-project.model';
import { SegmentFormData } from '../cabinet-form/model/segment.model';
import { CornerMechanismType } from '../cabinet-form/model/corner-cabinet.model';
import { CabinetVisualConfig } from '../cabinet-form/model/cabinet-visual-elements.model';
import { CountertopMaterialType, CountertopJointType, CountertopEdgeType } from './countertop.model';
import { FeetType, PlinthMaterialType } from './plinth.model';

/**
 * Strefa pozycjonowania szafki:
 * - BOTTOM: szafka dolna (zajmuje tylko dolny rząd)
 * - TOP: szafka górna/wisząca (zajmuje tylko górny rząd)
 * - FULL: słupek/lodówka (zajmuje oba rzędy - dolny i górny)
 */
export type CabinetZone = 'BOTTOM' | 'TOP' | 'FULL';

/**
 * Helpery do klasyfikacji typu szafki (analogicznie do backendu KitchenCabinetTypeEnum).
 */
export function isUpperCabinetType(type: KitchenCabinetType): boolean {
  return type.toString().startsWith('UPPER_');
}

export function isBaseCabinetType(type: KitchenCabinetType): boolean {
  return type.toString().startsWith('BASE_') || type === KitchenCabinetType.CORNER_CABINET;
}

export function isTallCabinetType(type: KitchenCabinetType): boolean {
  return type === KitchenCabinetType.TALL_CABINET;
}

export function requiresPlinth(type: KitchenCabinetType): boolean {
  return isBaseCabinetType(type) || isTallCabinetType(type);
}

export function requiresCountertop(type: KitchenCabinetType): boolean {
  return isBaseCabinetType(type);
}

export interface KitchenCabinet {
  id: string;
  name?: string; // opcjonalna nazwa szafki
  type: KitchenCabinetType;
  openingType: OpeningType;
  width: number;
  height: number;
  depth: number;
  positionY: number; // wysokość od podłogi (0 = dolna, np. 1400 = wisząca)
  shelfQuantity: number;
  drawerQuantity?: number; // ilość szuflad (dla typu BASE_WITH_DRAWERS)
  drawerModel?: string; // system szuflad (ANTARO_TANDEMBOX, SEVROLL_BALL)
  segments?: SegmentFormData[]; // segmenty (dla typu TALL_CABINET)

  // Pola kaskadowe (dla UPPER_CASCADE)
  cascadeLowerHeight?: number;
  cascadeLowerDepth?: number;
  cascadeUpperHeight?: number;
  cascadeUpperDepth?: number;
  cascadeLowerIsLiftUp?: boolean;         // klapa lift-up segmentu dolnego
  cascadeLowerIsFrontExtended?: boolean;  // przedłużony front segmentu dolnego
  cascadeUpperIsLiftUp?: boolean;         // klapa lift-up segmentu górnego

  // Pola dla szafki narożnej (CORNER_CABINET)
  cornerWidthA?: number;  // Szerokość na ścianie A (głównej)
  cornerWidthB?: number;  // Szerokość na ścianie B (bocznej) — Type A only
  cornerMechanism?: CornerMechanismType;  // Typ mechanizmu (Magic Corner, karuzela, itp.)
  cornerShelfQuantity?: number;  // Liczba półek (dla FIXED_SHELVES lub BLIND_CORNER)
  isUpperCorner?: boolean;  // true = górna wisząca, false = dolna (Type A only)
  cornerOpeningType?: string;  // Type A base: TWO_DOORS | BIFOLD
  cornerFrontUchylnyWidthMm?: number;  // Type B: szerokość frontu uchylnego 400-600mm

  // Pozycjonowanie szafek wiszących
  positioningMode?: PositioningMode;  // tryb pozycjonowania (dla UPPER_*)
  gapFromCountertopMm?: number;       // odstęp od blatu (dla RELATIVE_TO_COUNTERTOP)

  // Obudowa boczna
  leftEnclosureType?: string;   // EnclosureType ('NONE' | 'SIDE_PLATE_WITH_PLINTH' | ...)
  rightEnclosureType?: string;
  leftSupportPlate?: boolean;   // podpora blendy (tylko PARALLEL_FILLER_STRIP)
  rightSupportPlate?: boolean;
  distanceFromWallMm?: number | null; // null = użyj globalnych ustawień
  leftFillerWidthOverrideMm?: number | null;   // override szerokości lewej blendy (null = globalny)
  rightFillerWidthOverrideMm?: number | null;  // override szerokości prawej blendy (null = globalny)

  // Konfiguracja wizualna (cokoły, nóżki, uchwyty, fronty)
  visualConfig?: CabinetVisualConfig;

  // Nowy sposób liczenia dolnych: dolny wieniec na podłodze, boki oparte na wieńcu
  bottomWreathOnFloor?: boolean;

  // Pola szafki zlewowej (BASE_SINK)
  sinkFrontType?: string;      // ONE_DOOR | TWO_DOORS | DRAWER
  sinkApronEnabled?: boolean;  // blenda maskująca ON/OFF
  sinkApronHeightMm?: number;  // wysokość blendy (50–200mm)
  sinkDrawerModel?: string;    // system szuflad (gdy DRAWER)

  // Pola szafki pod płytę grzewczą (BASE_COOKTOP)
  cooktopType?: string;        // GAS | INDUCTION
  cooktopFrontType?: string;   // DRAWERS | TWO_DOORS | ONE_DOOR

  // Pola szafki wiszącej na okap (UPPER_HOOD)
  hoodFrontType?: string;      // FLAP | TWO_DOORS | OPEN
  hoodScreenEnabled?: boolean; // blenda wewnętrzna maskująca mechanizm okapu
  hoodScreenHeightMm?: number; // wysokość blendy wewnętrznej (50–200mm)

  // Pola szafki na piekarnik (BASE_OVEN)
  ovenHeightType?: string;         // STANDARD (595mm) | COMPACT (455mm)
  ovenLowerSectionType?: string;   // LOW_DRAWER | HINGED_DOOR | NONE
  ovenApronEnabled?: boolean;      // blenda dekoracyjna nad piekarnikiem
  ovenApronHeightMm?: number;      // wysokość blendy (30–150mm)

  // Pola szafek wiszących (UPPER_ONE_DOOR, UPPER_TWO_DOOR)
  isLiftUp?: boolean;          // klapa lift-up zamiast drzwi obrotowych
  isFrontExtended?: boolean;   // front wychodzi ponad górny wieniec (extendedFrontMm)

  calculatedResult?: CabinetCalculationResult;
}

/**
 * Określa strefę szafki na podstawie typu (zamiast positionY/height).
 * - TALL_CABINET → FULL (zajmuje oba rzędy)
 * - UPPER_* → TOP (szafka wisząca)
 * - CORNER_CABINET z isUpperCorner → TOP
 * - BASE_* / CORNER_CABINET dolna → BOTTOM
 */
export function getCabinetZone(cabinet: KitchenCabinet): CabinetZone {
  // Słupek → FULL
  if (isTallCabinetType(cabinet.type)) {
    return 'FULL';
  }
  // Szafki wiszące (UPPER_*) → TOP
  if (isUpperCabinetType(cabinet.type)) {
    return 'TOP';
  }
  // Narożna górna → TOP
  if (cabinet.type === KitchenCabinetType.CORNER_CABINET && cabinet.isUpperCorner) {
    return 'TOP';
  }
  // Domyślnie szafka dolna → BOTTOM
  return 'BOTTOM';
}

export interface CabinetCalculationResult {
  totalCost: number;
  boardCosts: number;
  componentCosts: number;
  jobCosts: number;
}

export interface KitchenWallConfig {
  length: number;
  height: number;
}

/**
 * Reprezentacja ściany z szafkami w stanie aplikacji.
 * Używana do zarządzania wieloma ścianami w projekcie kuchni.
 */
export interface WallWithCabinets {
  id: string;
  type: WallType;
  widthMm: number;
  heightMm: number;
  cabinets: KitchenCabinet[];

  // Konfiguracja blatu dla tej ściany
  countertopConfig?: CountertopConfig;

  // Konfiguracja cokołu dla tej ściany
  plinthConfig?: PlinthConfig;
}

/**
 * Konfiguracja blatu dla ściany (uproszczona wersja w stanie aplikacji).
 */
export interface CountertopConfig {
  enabled: boolean;
  materialType?: CountertopMaterialType;
  thicknessMm?: number;
  colorCode?: string;
  manualLengthMm?: number;
  manualDepthMm?: number;
  frontOverhangMm?: number;
  jointType?: CountertopJointType;
  edgeType?: CountertopEdgeType;
  /** Naddatek boczny z każdej strony ponad blendy (mm). Default: 5mm. */
  sideOverhangExtraMm?: number;
}

/**
 * Konfiguracja cokołu dla ściany (uproszczona wersja w stanie aplikacji).
 */
export interface PlinthConfig {
  enabled: boolean;
  feetType?: FeetType;
  materialType?: PlinthMaterialType;
  colorCode?: string;
  setbackMm?: number;
  /** Grubość płyty cokołowej w mm (domyślnie: 18 dla MDF/CHIPBOARD, 16 dla PVC/ALUMINUM) */
  thicknessMm?: number;
}

export interface CabinetPosition {
  cabinetId: string;
  name?: string;
  x: number;
  y: number; // pozycja Y (wysokość od podłogi)
  width: number;
  height: number;
}

export interface CabinetFormData {
  name?: string;
  kitchenCabinetType: KitchenCabinetType;
  openingType: OpeningType;
  width: number;
  height: number;
  depth: number;
  positionY: number;
  shelfQuantity: number;
  drawerQuantity?: number;
  drawerModel?: string | null;
  segments?: SegmentFormData[];  // dla TALL_CABINET

  // Pola kaskadowe (dla UPPER_CASCADE)
  cascadeLowerHeight?: number;
  cascadeLowerDepth?: number;
  cascadeUpperHeight?: number;
  cascadeUpperDepth?: number;
  cascadeLowerIsLiftUp?: boolean;
  cascadeLowerIsFrontExtended?: boolean;
  cascadeUpperIsLiftUp?: boolean;

  // Pola dla szafki narożnej (CORNER_CABINET)
  cornerWidthA?: number;
  cornerWidthB?: number;
  cornerMechanism?: CornerMechanismType;
  cornerShelfQuantity?: number;
  isUpperCorner?: boolean;
  cornerOpeningType?: string;
  cornerFrontUchylnyWidthMm?: number;

  // Pozycjonowanie szafek wiszących
  positioningMode?: PositioningMode;
  gapFromCountertopMm?: number;

  // Obudowa boczna
  leftEnclosureType?: string;
  rightEnclosureType?: string;
  leftSupportPlate?: boolean;
  rightSupportPlate?: boolean;
  distanceFromWallMm?: number | null;
  leftFillerWidthOverrideMm?: number | null;
  rightFillerWidthOverrideMm?: number | null;

  // Konfiguracja wizualna (cokoły, nóżki, uchwyty, fronty)
  visualConfig?: CabinetVisualConfig;

  // Nowy sposób liczenia dolnych: dolny wieniec na podłodze, boki oparte na wieńcu
  bottomWreathOnFloor?: boolean;

  // Pola szafki zlewowej (BASE_SINK)
  sinkFrontType?: string;      // ONE_DOOR | TWO_DOORS | DRAWER
  sinkApronEnabled?: boolean;  // blenda maskująca ON/OFF
  sinkApronHeightMm?: number;  // wysokość blendy (50–200mm)
  sinkDrawerModel?: string;    // system szuflad (gdy DRAWER)

  // Pola szafki wiszącej na okap (UPPER_HOOD)
  hoodFrontType?: string;      // FLAP | TWO_DOORS | OPEN
  hoodScreenEnabled?: boolean; // blenda wewnętrzna maskująca mechanizm okapu
  hoodScreenHeightMm?: number; // wysokość blendy wewnętrznej (50–200mm)

  // Pola szafki na piekarnik (BASE_OVEN)
  ovenHeightType?: string;         // STANDARD (595mm) | COMPACT (455mm)
  ovenLowerSectionType?: string;   // LOW_DRAWER | HINGED_DOOR | NONE
  ovenApronEnabled?: boolean;      // blenda dekoracyjna nad piekarnikiem
  ovenApronHeightMm?: number;      // wysokość blendy (30–150mm)

  // Pola szafek wiszących (UPPER_ONE_DOOR, UPPER_TWO_DOOR)
  isLiftUp?: boolean;          // klapa lift-up zamiast drzwi obrotowych
  isFrontExtended?: boolean;   // front wychodzi ponad górny wieniec (extendedFrontMm)
}

export interface CabinetCalculatedEvent {
  formData: CabinetFormData;
  result: any;
  editingCabinetId?: string;
}
