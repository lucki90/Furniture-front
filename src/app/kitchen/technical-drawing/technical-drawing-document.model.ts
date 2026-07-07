import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { CabinetSide, WallType } from '../model/kitchen-project.model';
import { TechnicalBoardRole, TechnicalDrawingModel, TechnicalFrontPanel } from './technical-drawing.model';

export type TechnicalDrawingDocumentSchemaVersion = 1;
export type TechnicalDrawingSkipReason = 'NO_CALCULATION_RESPONSE' | 'NO_BOARDS' | 'NO_DRAWABLE_BOARDS';

export interface TechnicalDrawingDocument {
  schemaVersion: TechnicalDrawingDocumentSchemaVersion;
  totals: TechnicalDrawingDocumentTotals;
  drawings: TechnicalDrawingDocumentItem[];
  skippedCabinets: TechnicalDrawingSkippedCabinet[];
}

export interface TechnicalDrawingDocumentTotals {
  wallCount: number;
  cabinetCount: number;
  drawingCount: number;
  skippedCabinetCount: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
}

export interface TechnicalDrawingDocumentItem {
  wall: TechnicalDrawingDocumentWall;
  cabinet: TechnicalDrawingDocumentCabinet;
  drawing: TechnicalDrawingDocumentModel;
}

export interface TechnicalDrawingDocumentWall {
  id: string;
  type: WallType;
  label: string;
  order: number;
  widthMm: number;
  heightMm: number;
  islandDepthMm: number | null;
}

export interface TechnicalDrawingDocumentCabinet {
  id: string;
  type: KitchenCabinetType;
  label: string;
  order: number;
  side: CabinetSide | null;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  positionY: number;
}

export interface TechnicalDrawingDocumentModel
  extends Omit<TechnicalDrawingModel, 'boards' | 'frontPanels'> {
  frontPanels: TechnicalFrontPanel[];
  boards: TechnicalDrawingDocumentBoard[];
}

export interface TechnicalDrawingDocumentBoard {
  boardName: string;
  role: TechnicalBoardRole;
  label: string;
  quantity: number;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  sourceSideX: number;
  sourceSideY: number;
  lShapeCutoutLengthAMm: number | null;
  lShapeCutoutLengthBMm: number | null;
}

export interface TechnicalDrawingSkippedCabinet {
  wallId: string;
  wallLabel: string;
  cabinetId: string;
  cabinetLabel: string;
  cabinetType: KitchenCabinetType;
  reason: TechnicalDrawingSkipReason;
}
