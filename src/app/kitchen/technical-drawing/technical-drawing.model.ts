import { Board } from '../cabinet-form/model/kitchen-cabinet-form.model';

export type TechnicalBoardRole =
  | 'SIDE'
  | 'BOTTOM_WREATH'
  | 'TOP_WREATH'
  | 'SHELF'
  | 'BACK'
  | 'FRONT'
  | 'DRAWER_FRONT'
  | 'SEGMENT_DIVIDER'
  | 'OTHER';

export interface TechnicalBoardRef {
  source: Board;
  role: TechnicalBoardRole;
  label: string;
  quantity: number;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
}

export interface TechnicalFrontPanel {
  label: string;
  quantity: number;
  widthMm: number;
  heightMm: number;
  role: 'FRONT' | 'DRAWER_FRONT';
}

export interface TechnicalDrawingModel {
  cabinetWidthMm: number;
  cabinetHeightMm: number;
  cabinetDepthMm: number;
  boardThicknessMm: number;
  boardCount: number;
  sourceConfidence: 'high' | 'medium' | 'low';
  frontPanels: TechnicalFrontPanel[];
  shelfCount: number;
  dividerCount: number;
  hasBackPanel: boolean;
  hasTopWreath: boolean;
  hasBottomWreath: boolean;
  lShapeBoardCount: number;
  boards: TechnicalBoardRef[];
  notes: string[];
}
