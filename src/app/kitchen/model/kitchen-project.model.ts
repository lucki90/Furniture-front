import { Board, Component, Job } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { OpeningType } from '../cabinet-form/model/kitchen-cabinet-constants';
import { SegmentRequest } from '../cabinet-form/model/segment.model';
import { CornerMechanismType } from '../cabinet-form/model/corner-cabinet.model';
import { CountertopRequest, CountertopResponse } from './countertop.model';
import { PlinthRequest, PlinthResponse } from './plinth.model';
import { FillerPanelRequest, FillerPanelResponse } from './filler-panel.model';

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

export type ProjectStatus = 'DRAFT' | 'CALCULATED' | 'CONFIRMED' | 'IN_PRODUCTION' | 'COMPLETED' | 'CANCELLED';

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Szkic' },
  { value: 'CALCULATED', label: 'Obliczony' },
  { value: 'CONFIRMED', label: 'Potwierdzony' },
  { value: 'IN_PRODUCTION', label: 'W produkcji' },
  { value: 'COMPLETED', label: 'Zakończony' },
  { value: 'CANCELLED', label: 'Anulowany' }
];

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
}

/**
 * Request dla szafki narożnej (CORNER_CABINET)
 */
export interface CornerCabinetRequest {
  widthA: number;
  widthB: number;
  mechanism: CornerMechanismType;
  shelfQuantity?: number;
  upperCabinet: boolean;
}

export interface DrawerRequest {
  drawerQuantity: number;
  drawerModel: string;
  drawerBaseHdf: boolean;
  drawerFrontDetails: any | null;
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

  totalCost: number;
  totalBoardsCost: number;
  totalComponentsCost: number;
  totalJobsCost: number;

  walls: WallDetailResponse[];

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

  // Additional configuration - tall cabinet segments
  segments?: SegmentRequest[];

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
  totalComponentCost: number;
  totalJobCost: number;
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

  // Blat, cokół i blendy
  countertop?: CountertopResponse;
  plinth?: PlinthResponse;
  fillerPanels?: FillerPanelResponse[];

  cabinetCount: number;
  usedWidthBottom: number;
  remainingWidthBottom: number;
  usedWidthTop: number;
  remainingWidthTop: number;
  fits: boolean;

  boardCost: number;
  componentCost: number;
  jobCost: number;
  cabinetsCost?: number;
  countertopCost?: number;
  plinthCost?: number;
  fillerPanelsCost?: number;
  wallTotalCost: number;
}
