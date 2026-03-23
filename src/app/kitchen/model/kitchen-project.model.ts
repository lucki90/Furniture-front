import { Board, Component, Job } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { OpeningType } from '../cabinet-form/model/kitchen-cabinet-constants';
import { SegmentRequest } from '../cabinet-form/model/segment.model';
import { CornerMechanismType } from '../cabinet-form/model/corner-cabinet.model';
import { CountertopRequest, CountertopResponse } from './countertop.model';
import { PlinthRequest, PlinthResponse } from './plinth.model';
import { FillerPanelRequest, FillerPanelResponse } from './filler-panel.model';
import { EnclosureConfig } from '../cabinet-form/model/enclosure.model';

// ============ ENCLOSURE RESPONSE ============

/**
 * Pojedyncza płyta wygenerowana przez obliczenie obudowy.
 */
export interface EnclosureBoardDto {
  label: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  materialCost: number;
}

/**
 * Response z kalkulacji obudowy jednej strony szafki.
 */
export interface EnclosureResponse {
  cabinetId: string;
  leftSide: boolean;
  enclosureType: string;
  boards: EnclosureBoardDto[];
  materialCost: number;
  cuttingCost: number;
  totalCost: number;
}

// ============ UPPER FILLER (blenda górna) ============

/**
 * Jeden segment blendy górnej (maks. 2800mm długości).
 */
export interface UpperFillerSegmentDto {
  segmentIndex: number;
  positionX: number;
  lengthMm: number;
  heightMm: number;
  requiresJoint: boolean;
  materialCost: number;
  cuttingCost: number;
  totalCost: number;
}

/**
 * Wynik kalkulacji blendy górnej dla jednej ściany.
 * Blenda górna biegnie nad wszystkimi szafkami wiszącymi.
 * Jeśli długość > 2800mm, jest dzielona na segmenty.
 */
export interface UpperFillerResponse {
  enabled: boolean;
  totalLengthMm: number;
  heightMm: number;
  segmentCount: number;
  wasSplit: boolean;
  segments: UpperFillerSegmentDto[];
  totalCost: number;
}

// ============ POSITIONING MODE ============

/**
 * Tryb pozycjonowania szafki wiszącej:
 * - RELATIVE_TO_CEILING: góra szafki = wallHeight - fillerHeight
 * - RELATIVE_TO_COUNTERTOP: dół szafki = countertopHeight + gap
 */
export type PositioningMode = 'RELATIVE_TO_CEILING' | 'RELATIVE_TO_COUNTERTOP';

// ============ WALL TYPES ============

export type WallType = 'MAIN' | 'LEFT' | 'RIGHT' | 'CORNER_LEFT' | 'CORNER_RIGHT' | 'ISLAND';

export const WALL_TYPES: { value: WallType; label: string }[] = [
  { value: 'MAIN', label: 'Ściana główna' },
  { value: 'LEFT', label: 'Ściana lewa' },
  { value: 'RIGHT', label: 'Ściana prawa' },
  { value: 'CORNER_LEFT', label: 'Narożnik lewy' },
  { value: 'CORNER_RIGHT', label: 'Narożnik prawy' },
  { value: 'ISLAND', label: 'Wyspa kuchenna' }
];

// ============ PROJECT STATUS ============

export type ProjectStatus = 'DRAFT' | 'OFFER_SENT' | 'ACCEPTED' | 'IN_PRODUCTION' | 'IN_INSTALLATION' | 'COMPLETED' | 'CANCELLED';

export const PROJECT_STATUSES: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'DRAFT', label: 'Szkic', color: '#6b7280' },
  { value: 'OFFER_SENT', label: 'Oferta wysłana', color: '#2563eb' },
  { value: 'ACCEPTED', label: 'Zaakceptowany', color: '#16a34a' },
  { value: 'IN_PRODUCTION', label: 'W produkcji', color: '#ea580c' },
  { value: 'IN_INSTALLATION', label: 'W montażu', color: '#7c3aed' },
  { value: 'COMPLETED', label: 'Zakończony', color: '#065f46' },
  { value: 'CANCELLED', label: 'Anulowany', color: '#dc2626' }
];

export function getStatusLabel(status: ProjectStatus): string {
  return PROJECT_STATUSES.find(s => s.value === status)?.label ?? status;
}

export function getStatusColor(status: ProjectStatus): string {
  return PROJECT_STATUSES.find(s => s.value === status)?.color ?? '#6b7280';
}

// ============ LEGACY - SIMPLE CALCULATE ============

/**
 * Request do kalkulacji całego projektu kuchni (legacy - single wall)
 */
export interface KitchenProjectRequest {
  wall: KitchenWallRequest;
  cabinets: ProjectCabinetRequest[];
}

export interface KitchenWallRequest {
  length: number;
  height: number;
}

export interface ProjectCabinetRequest {
  cabinetId: string;
  kitchenCabinetType: KitchenCabinetType;
  openingType: OpeningType;
  height: number;
  width: number;
  depth: number;
  positionX: number;
  positionY: number;
  shelfQuantity: number;
  varnishedFront: boolean;
  materialRequest: MaterialRequest;
  drawerRequest?: DrawerRequest;
  segments?: SegmentRequest[];  // dla TALL_CABINET
  cornerRequest?: CornerCabinetRequest;  // dla CORNER_CABINET

  // Segmenty kaskadowe (dla UPPER_CASCADE)
  cascadeSegments?: CascadeSegmentRequest[];

  // Pozycjonowanie szafek wiszących
  positioningMode?: PositioningMode;  // null dla szafek dolnych i słupków
  gapFromCountertopMm?: number;       // odstęp od blatu (dla RELATIVE_TO_COUNTERTOP)

  // Obudowa boczna (lewa i prawa strona)
  leftEnclosure?: EnclosureConfig;
  rightEnclosure?: EnclosureConfig;

  /** null = użyj wartości z ustawień globalnych użytkownika */
  distanceFromWallMm?: number | null;

  /** Dolny wieniec na podłodze: boki oparte na wieńcu. Tylko BASE_*. */
  bottomWreathOnFloor?: boolean;

  // Pola szafki zlewowej (BASE_SINK)
  sinkFrontType?: string;      // ONE_DOOR | TWO_DOORS | DRAWER
  sinkApronEnabled?: boolean;  // blenda maskująca ON/OFF
  sinkApronHeightMm?: number;  // wysokość blendy (50–200mm)

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

/**
 * Request dla szafki narożnej (CORNER_CABINET)
 */
export interface CornerCabinetRequest {
  widthA: number;
  widthB?: number | null;    // null dla Type B (brak ściany B)
  mechanism: CornerMechanismType;
  shelfQuantity?: number;
  upperCabinet: boolean;
  cornerOpeningType?: string;       // Type A base: TWO_DOORS | BIFOLD
  frontUchylnyWidthMm?: number;     // Type B: szerokość frontu uchylnego 400-600mm
  magicCornerFrontOnHinges?: boolean; // MAGIC_CORNER: front na zawiasach (opcjonalne)
}

export interface DrawerRequest {
  drawerQuantity: number;
  drawerModel: string;
  drawerBaseHdf: boolean;
  drawerFrontDetails: any | null;
}

/**
 * Segment szafki kaskadowej (UPPER_CASCADE).
 * orderIndex=0 = dolny (głębszy), orderIndex=1 = górny (płytszy).
 */
export interface CascadeSegmentRequest {
  orderIndex: number;
  height: number;
  depth: number;
  frontType: string;
  shelfQuantity: number;
  isLiftUp?: boolean;
  isFrontExtended?: boolean;
}

export interface MaterialRequest {
  boxMaterial: string;
  boxBoardThickness: number;
  boxColor: string;
  boxVeneerColor: string;
  frontMaterial: string;
  frontBoardThickness: number;
  frontColor: string;
  frontVeneerColor: string | null;
}

/**
 * Response z kalkulacji projektu kuchni
 */
export interface KitchenProjectResponse {
  wall: WallSummary;
  cabinets: CabinetSummary[];

  usedWidthBottom: number;
  remainingWidthBottom: number;
  usedWidthTop: number;
  remainingWidthTop: number;
  fits: boolean;

  totalBoardCost: number;
  totalComponentCost: number;
  totalJobCost: number;
  totalProjectCost: number;
}

export interface WallSummary {
  length: number;
  height: number;
}

export interface CabinetSummary {
  cabinetId: string;
  kitchenCabinetType: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  depth: number;

  boards: Board[];
  components: Component[];
  jobs: Job[];

  boardCost: number;
  componentCost: number;
  jobCost: number;
  totalCost: number;
}

// ============ PROJECT MANAGEMENT CRUD ============

/**
 * Request do utworzenia nowego projektu kuchni (z wieloma ścianami)
 */
export interface CreateKitchenProjectRequest {
  name: string;
  description?: string;
  walls: ProjectWallRequest[];

  // Ustawienia projektu (globalne)
  plinthHeightMm?: number;           // Wysokość cokołu (domyślnie 100mm)
  countertopThicknessMm?: number;    // Grubość blatu (domyślnie 38mm)
  upperFillerHeightMm?: number;      // Wysokość blendy górnej (domyślnie 100mm, 0=brak)
}

export interface ProjectWallRequest {
  wallType: WallType;
  widthMm: number;
  heightMm: number;
  cabinets: ProjectCabinetRequest[];
  countertop?: CountertopRequest;
  plinth?: PlinthRequest;
  fillerPanels?: FillerPanelRequest[];
}

/**
 * Request do aktualizacji projektu
 */
export interface UpdateKitchenProjectRequest {
  name: string;
  description?: string;
  status?: ProjectStatus;
  walls: ProjectWallRequest[];

  // Ustawienia projektu (globalne)
  plinthHeightMm?: number;
  countertopThicknessMm?: number;
  upperFillerHeightMm?: number;
}

/**
 * Response - lista projektów (podsumowanie)
 */
export interface KitchenProjectListResponse {
  id: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  totalCost: number;
  wallCount: number;
  cabinetCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response - szczegóły projektu
 */
export interface KitchenProjectDetailResponse {
  id: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  version: number;

  // Dozwolone przejścia statusu
  allowedTransitions?: ProjectStatus[];

  // Ustawienia projektu (globalne)
  plinthHeightMm?: number;
  countertopThicknessMm?: number;
  upperFillerHeightMm?: number;

  totalCost: number;
  totalBoardsCost: number;
  totalComponentsCost: number;
  totalJobsCost: number;

  walls: WallDetailResponse[];

  // Workflow timestamps
  offerSentAt?: string;
  acceptedAt?: string;
  productionStartedAt?: string;
  installationStartedAt?: string;
  completedAt?: string;
  cancelledAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface WallDetailResponse {
  id: number;
  wallType: WallType;
  widthMm: number;
  heightMm: number;
  wallCost: number;

  cabinets: CabinetPlacementResponse[];

  // Odpowiedzi kalkulacji blatu i cokołu (zawierają też konfigurację)
  countertop?: CountertopResponse;
  plinth?: PlinthResponse;

  cabinetCount: number;
  usedWidthMm: number;
  remainingWidthMm: number;
}

export interface CabinetPlacementResponse {
  id: number;
  cabinetId?: string;
  cabinetType: KitchenCabinetType;

  positionX: number;
  positionY: number;

  widthMm: number;
  heightMm: number;
  depthMm: number;

  boxMaterialCode: string;
  boxThicknessMm: number;
  boxColorCode: string;
  frontMaterialCode?: string;
  frontThicknessMm?: number;
  frontColorCode?: string;

  openingType?: string;

  // Additional configuration - drawers
  drawerQuantity?: number;
  drawerModel?: string;
  shelfQuantity?: number;

  // Additional configuration - corner cabinet
  cornerWidthA?: number;
  cornerWidthB?: number;
  cornerMechanism?: string;
  cornerShelfQuantity?: number;
  isUpperCorner?: boolean;
  cornerOpeningType?: string;
  cornerFrontUchylnyWidthMm?: number;

  // Additional configuration - tall cabinet segments
  segments?: SegmentRequest[];

  // Pozycjonowanie szafek wiszących
  positioningMode?: PositioningMode;
  gapFromCountertopMm?: number;

  boardsCost: number;
  componentsCost: number;
  jobsCost: number;
  totalCost: number;

  displayOrder: number;
}

// ============ MULTI-WALL CALCULATE ============

/**
 * Request do kalkulacji projektu z wieloma ścianami (bez zapisu do bazy)
 */
export interface MultiWallCalculateRequest {
  walls: ProjectWallRequest[];
}

/**
 * Response z kalkulacji wielu ścian
 */
export interface MultiWallCalculateResponse {
  walls: WallCalculationSummary[];

  wallCount: number;
  totalCabinetCount: number;
  allFit: boolean;

  totalBoardCost: number;
  /** Koszt komponentów bez odpadu. */
  totalComponentCost: number;
  /** Koszt odpadu z cięcia płyt (wydzielony). Wliczony już w totalProjectCost. */
  totalWasteCost: number;
  totalJobCost: number;
  /** Koszt obudów (płyty boczne, blendy). */
  totalEnclosureCost?: number;
  /** Koszt blend górnych (listwy nad szafkami wiszącymi). */
  totalUpperFillerCost?: number;
  /** Koszt całkowity z odpadem: totalBoardCost + totalComponentCost + totalWasteCost + totalJobCost + totalEnclosureCost + totalUpperFillerCost. */
  totalProjectCost: number;
}

/**
 * Podsumowanie kalkulacji pojedynczej ściany
 */
export interface WallCalculationSummary {
  wallType: WallType;
  widthMm: number;
  heightMm: number;

  cabinets: CabinetSummary[];

  // Blat, cokół, blendy, obudowy i blenda górna
  countertop?: CountertopResponse;
  plinth?: PlinthResponse;
  fillerPanels?: FillerPanelResponse[];
  enclosures?: EnclosureResponse[];
  enclosuresCost?: number;
  upperFiller?: UpperFillerResponse;
  upperFillerCost?: number;

  cabinetCount: number;
  usedWidthBottom: number;
  remainingWidthBottom: number;
  usedWidthTop: number;
  remainingWidthTop: number;
  fits: boolean;

  boardCost: number;
  componentCost: number;
  /** Koszt odpadu z cięcia płyt (wydzielony, wliczony w wallTotalCost). */
  wasteCost?: number;
  jobCost: number;
  cabinetsCost?: number;
  countertopCost?: number;
  plinthCost?: number;
  fillerPanelsCost?: number;
  wallTotalCost: number;
}
