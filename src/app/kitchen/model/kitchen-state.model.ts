import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { OpeningType } from '../cabinet-form/model/kitchen-cabinet-constants';
import { WallType, PositioningMode } from './kitchen-project.model';
import { SegmentFormData } from '../cabinet-form/model/segment.model';
import { CornerMechanismType } from '../cabinet-form/model/corner-cabinet.model';
import { CabinetVisualConfig } from '../cabinet-form/model/cabinet-visual-elements.model';
import { CountertopMaterialType, CountertopJointType, CountertopEdgeType } from './countertop.model';
import { FeetType, PlinthMaterialType } from './plinth.model';
import { CabinetResponse } from '../cabinet-form/model/kitchen-cabinet-form.model';

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
  if (type === KitchenCabinetType.BASE_OVEN_FREESTANDING || type === KitchenCabinetType.BASE_FRIDGE_FREESTANDING) return false;
  return isBaseCabinetType(type) || isTallCabinetType(type) || type === KitchenCabinetType.BASE_FRIDGE;
}

export function requiresCountertop(type: KitchenCabinetType): boolean {
  if (type === KitchenCabinetType.BASE_OVEN_FREESTANDING || type === KitchenCabinetType.BASE_FRIDGE_FREESTANDING
      || type === KitchenCabinetType.BASE_FRIDGE) return false;
  return isBaseCabinetType(type);
}

/**
 * Sprawdza czy szafka jest wolnostojącym AGD (zmywarka/piekarnik/lodówka wolnostojąca).
 * Wolnostojące AGD: 0 płyt, tylko wizualizacja (srebrny kolor SVG), brak komponentów cokołowych.
 * Analogicznie do backendu: KitchenCabinetTypeEnum.isFreestandingAppliance().
 */
export function isFreestandingAppliance(type: KitchenCabinetType): boolean {
  return type === KitchenCabinetType.BASE_DISHWASHER_FREESTANDING
      || type === KitchenCabinetType.BASE_OVEN_FREESTANDING
      || type === KitchenCabinetType.BASE_FRIDGE_FREESTANDING;
}

/**
 * Sprawdza czy szafka przerywa ciągłość blatu roboczego.
 * Analogicznie do backendu: KitchenCabinetTypeEnum.interruptsCountertop().
 */
export function interruptsCountertop(type: KitchenCabinetType): boolean {
  return type === KitchenCabinetType.TALL_CABINET
      || type === KitchenCabinetType.BASE_FRIDGE
      || type === KitchenCabinetType.BASE_FRIDGE_FREESTANDING;
}

/**
 * Sprawdza czy szafka może mieć segmenty (TALL_CABINET i BASE_FRIDGE).
 * Używane przy mapowaniu szafek z segmentami do backendu.
 */
export function hasSegments(type: KitchenCabinetType): boolean {
  return type === KitchenCabinetType.TALL_CABINET
      || type === KitchenCabinetType.BASE_FRIDGE;
}

/**
 * Type guard — zawęża KitchenCabinet do typów posiadających pole `segments`.
 * Użyj zamiast hasSegments(cab.type) gdy potrzebujesz dostępu do cab.segments.
 */
export function cabinetHasSegments(cab: KitchenCabinet): cab is KCabinetTall | KCabinetFridge {
  return hasSegments(cab.type);
}

/**
 * Pola wspólne dla WSZYSTKICH typów szafek.
 * Nie zawiera żadnych pól type-specific — te są w dedykowanych interfejsach poniżej.
 */
export interface KitchenCabinetBase {
  id: string;
  name?: string;
  openingType: OpeningType;
  width: number;
  height: number;
  depth: number;
  positionY: number; // wysokość od podłogi (0 = dolna, np. 1400 = wisząca)
  shelfQuantity: number;

  // Pozycjonowanie szafek wiszących (ignorowane dla dolnych/FULL)
  positioningMode?: PositioningMode;
  gapFromCountertopMm?: number;

  // Obudowa boczna (wszystkie typy mogą mieć obudowę)
  leftEnclosureType?: string;   // 'NONE' | 'SIDE_PLATE_WITH_PLINTH' | 'SIDE_PLATE_TO_FLOOR' | 'PARALLEL_FILLER_STRIP'
  rightEnclosureType?: string;
  leftSupportPlate?: boolean;
  rightSupportPlate?: boolean;
  distanceFromWallMm?: number | null;
  leftFillerWidthOverrideMm?: number | null;
  rightFillerWidthOverrideMm?: number | null;

  // Konfiguracja wizualna i inne wspólne opcje
  visualConfig?: CabinetVisualConfig;
  bottomWreathOnFloor?: boolean;

  calculatedResult?: CabinetCalculationResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// Typy szafek dolnych (BASE_*)
// ─────────────────────────────────────────────────────────────────────────────

export interface KCabinetOneDoor extends KitchenCabinetBase {
  type: KitchenCabinetType.BASE_ONE_DOOR;
}

export interface KCabinetTwoDoor extends KitchenCabinetBase {
  type: KitchenCabinetType.BASE_TWO_DOOR;
}

export interface KCabinetWithDrawers extends KitchenCabinetBase {
  type: KitchenCabinetType.BASE_WITH_DRAWERS;
  drawerQuantity: number;
  drawerModel: string;
}

export interface KCabinetSink extends KitchenCabinetBase {
  type: KitchenCabinetType.BASE_SINK;
  sinkFrontType: string;      // ONE_DOOR | TWO_DOORS | DRAWER
  sinkApronEnabled: boolean;  // blenda maskująca ON/OFF
  sinkApronHeightMm: number;  // wysokość blendy (50–200mm)
  sinkDrawerModel?: string;   // system szuflad (gdy DRAWER)
}

export interface KCabinetCooktop extends KitchenCabinetBase {
  type: KitchenCabinetType.BASE_COOKTOP;
  cooktopType: string;        // GAS | INDUCTION
  cooktopFrontType: string;   // DRAWERS | TWO_DOORS | ONE_DOOR
  drawerQuantity?: number;    // ilość szuflad (gdy DRAWERS)
  drawerModel?: string;       // system szuflad (gdy DRAWERS)
}

export interface KCabinetDishwasher extends KitchenCabinetBase {
  type: KitchenCabinetType.BASE_DISHWASHER;
}

export interface KCabinetDishwasherFreestanding extends KitchenCabinetBase {
  type: KitchenCabinetType.BASE_DISHWASHER_FREESTANDING;
}

export interface KCabinetOven extends KitchenCabinetBase {
  type: KitchenCabinetType.BASE_OVEN;
  ovenHeightType: string;        // STANDARD (595mm) | COMPACT (455mm)
  ovenLowerSectionType: string;  // LOW_DRAWER | HINGED_DOOR | NONE
  ovenApronEnabled: boolean;     // blenda dekoracyjna nad piekarnikiem
  ovenApronHeightMm: number;     // wysokość blendy (30–150mm)
  drawerModel?: string;          // system szuflad (gdy LOW_DRAWER)
}

export interface KCabinetOvenFreestanding extends KitchenCabinetBase {
  type: KitchenCabinetType.BASE_OVEN_FREESTANDING;
}

export interface KCabinetFridge extends KitchenCabinetBase {
  type: KitchenCabinetType.BASE_FRIDGE;
  fridgeSectionType: string;   // ONE_DOOR | TWO_DOORS
  lowerFrontHeightMm: number;  // wysokość frontu zamrażarki (500–900mm, dla TWO_DOORS)
  segments?: SegmentFormData[]; // opcjonalne sekcje górne (DOOR/OPEN_SHELF)
}

export interface KCabinetFridgeFreestanding extends KitchenCabinetBase {
  type: KitchenCabinetType.BASE_FRIDGE_FREESTANDING;
  fridgeFreestandingType: string; // SINGLE_DOOR | TWO_DOORS | SIDE_BY_SIDE
}

// ─────────────────────────────────────────────────────────────────────────────
// Słupek i narożna
// ─────────────────────────────────────────────────────────────────────────────

export interface KCabinetTall extends KitchenCabinetBase {
  type: KitchenCabinetType.TALL_CABINET;
  segments?: SegmentFormData[];
}

export interface KCabinetCorner extends KitchenCabinetBase {
  type: KitchenCabinetType.CORNER_CABINET;
  cornerWidthA: number;
  cornerWidthB?: number;               // ściana B (tylko Type A)
  cornerMechanism: CornerMechanismType;
  cornerShelfQuantity?: number;
  isUpperCorner: boolean;
  cornerOpeningType?: string;          // TWO_DOORS | BIFOLD (Type A dolna)
  cornerFrontUchylnyWidthMm?: number;  // szerokość frontu uchylnego (Type B)
}

// ─────────────────────────────────────────────────────────────────────────────
// Typy szafek wiszących (UPPER_*)
// ─────────────────────────────────────────────────────────────────────────────

export interface KCabinetUpperOneDoor extends KitchenCabinetBase {
  type: KitchenCabinetType.UPPER_ONE_DOOR;
  isLiftUp: boolean;
  isFrontExtended: boolean;
}

export interface KCabinetUpperTwoDoor extends KitchenCabinetBase {
  type: KitchenCabinetType.UPPER_TWO_DOOR;
  isLiftUp: boolean;
  isFrontExtended: boolean;
}

export interface KCabinetUpperOpenShelf extends KitchenCabinetBase {
  type: KitchenCabinetType.UPPER_OPEN_SHELF;
}

export interface KCabinetCascade extends KitchenCabinetBase {
  type: KitchenCabinetType.UPPER_CASCADE;
  cascadeLowerHeight: number;
  cascadeLowerDepth: number;
  cascadeUpperHeight: number;
  cascadeUpperDepth: number;
  cascadeLowerIsLiftUp: boolean;
  cascadeLowerIsFrontExtended: boolean;
  cascadeUpperIsLiftUp: boolean;
}

export interface KCabinetHood extends KitchenCabinetBase {
  type: KitchenCabinetType.UPPER_HOOD;
  hoodFrontType: string;      // FLAP | TWO_DOORS | OPEN
  hoodScreenEnabled: boolean; // blenda wewnętrzna okapu ON/OFF
  hoodScreenHeightMm: number; // wysokość blendy (50–200mm)
}

export interface KCabinetDrainer extends KitchenCabinetBase {
  type: KitchenCabinetType.UPPER_DRAINER;
  drainerFrontType: string;   // OPEN | ONE_DOOR | TWO_DOORS
}

// ─────────────────────────────────────────────────────────────────────────────
// Główny discriminated union — jedyna publiczna forma KitchenCabinet.
// Dodanie nowego typu szafki = nowy interfejs powyżej + nowa gałąź unii poniżej.
// TypeScript wymusi obsługę nowego case'u we WSZYSTKICH switch-ach (exhaustive check).
// ─────────────────────────────────────────────────────────────────────────────
export type KitchenCabinet =
  | KCabinetOneDoor | KCabinetTwoDoor | KCabinetWithDrawers
  | KCabinetSink | KCabinetCooktop
  | KCabinetDishwasher | KCabinetDishwasherFreestanding
  | KCabinetOven | KCabinetOvenFreestanding
  | KCabinetFridge | KCabinetFridgeFreestanding
  | KCabinetTall | KCabinetCorner
  | KCabinetUpperOneDoor | KCabinetUpperTwoDoor | KCabinetUpperOpenShelf
  | KCabinetCascade | KCabinetHood | KCabinetDrainer;

/**
 * Określa strefę szafki na podstawie typu (zamiast positionY/height).
 * - TALL_CABINET → FULL (zajmuje oba rzędy)
 * - UPPER_* → TOP (szafka wisząca)
 * - CORNER_CABINET z isUpperCorner → TOP
 * - BASE_* / CORNER_CABINET dolna → BOTTOM
 */
export function getCabinetZone(cabinet: KitchenCabinet): CabinetZone {
  // Słupek i lodówka w zabudowie → FULL (od podłogi do sufitu)
  if (isTallCabinetType(cabinet.type) || cabinet.type === KitchenCabinetType.BASE_FRIDGE) {
    return 'FULL';
  }
  // Szafki wiszące (UPPER_*) → TOP
  if (isUpperCabinetType(cabinet.type)) {
    return 'TOP';
  }
  // Narożna górna → TypeScript zawęża do KCabinetCorner po sprawdzeniu type
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

  // Pola szafki na lodówkę (BASE_FRIDGE)
  fridgeSectionType?: string;      // ONE_DOOR | TWO_DOORS
  lowerFrontHeightMm?: number;     // wysokość dolnego frontu zamrażarki (500–900mm, tylko TWO_DOORS)

  // Pola lodówki wolnostojącej (BASE_FRIDGE_FREESTANDING)
  fridgeFreestandingType?: string; // SINGLE_DOOR | TWO_DOORS | SIDE_BY_SIDE

  // Pola szafek wiszących (UPPER_ONE_DOOR, UPPER_TWO_DOOR)
  isLiftUp?: boolean;          // klapa lift-up zamiast drzwi obrotowych
  isFrontExtended?: boolean;   // front wychodzi ponad górny wieniec (extendedFrontMm)

  // Pola szafki wiszącej z ociekaczem (UPPER_DRAINER)
  drainerFrontType?: string;   // OPEN | ONE_DOOR | TWO_DOORS
}

export interface CabinetCalculatedEvent {
  formData: CabinetFormData;
  result: CabinetResponse;
  editingCabinetId?: string;
}
