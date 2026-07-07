import { Board } from '../cabinet-form/model/kitchen-cabinet-form.model';
import {
  TechnicalBoardRef,
  TechnicalBoardRole,
  TechnicalDrawingModel,
  TechnicalFrontPanel
} from './technical-drawing.model';

const TOP_WREATH_NAMES = new Set(['TOP_WREATH_NAME', 'TOP_WREATH_L_SHAPE']);
const BOTTOM_WREATH_NAMES = new Set(['WREATH_NAME', 'WREATH_L_SHAPE']);
const SHELF_NAMES = new Set(['SHELF_NAME', 'SHELF_L_SHAPE']);
const FRONT_NAMES = new Set([
  'FRONT_NAME',
  'SINK_APRON',
  'HOOD_SCREEN',
  'BLIND_PANEL',
  'BLIND_PANEL_HIDDEN',
  'BLIND_FILLER_OUTER',
  'BIFOLD_INNER_FRONT',
  'OVEN_APRON',
  'OVEN_TRAY_FRONT',
  'PASSAGE_PLINTH_FACE',
  'PASSAGE_PLINTH_RECESSED'
]);
const DRAWER_FRONT_NAMES = new Set(['FRONT_DRAWER_NAME']);
const BACK_NAMES = new Set(['HDF_NAME', 'CORNER_BACK_PANEL_B']);
const DIVIDER_NAMES = new Set(['SEGMENT_DIVIDER_NAME']);
const WIDTH_FROM_SIDE_Y_ROLES = new Set<TechnicalBoardRole>([
  'FRONT',
  'DRAWER_FRONT',
  'BACK',
  'SIDE',
  'SHELF',
  'BOTTOM_WREATH',
  'TOP_WREATH'
]);

export function buildTechnicalDrawingModel(boards: Board[] | null | undefined): TechnicalDrawingModel | null {
  const validBoards = (boards ?? []).filter(hasPositiveDimensions);
  if (validBoards.length === 0) {
    return null;
  }

  const boardRefs = validBoards.map(toTechnicalBoardRef);
  const sideBoard = firstByRole(boardRefs, 'SIDE');
  const backBoard = firstByRole(boardRefs, 'BACK');
  const frontPanels = buildFrontPanels(boardRefs);
  const mainFrontPanel = frontPanels[0];
  const thickness = inferBoardThickness(boardRefs);
  const cabinetHeight = maxPositive(
    sideBoard?.heightMm,
    backBoard?.heightMm,
    ...frontPanels.map(panel => panel.heightMm)
  ) ?? maxBoardSide(validBoards);
  const cabinetWidth = inferCabinetWidth(boardRefs, frontPanels, backBoard, thickness);
  const cabinetDepth = inferCabinetDepth(boardRefs, sideBoard);
  const sourceConfidence = sideBoard && (mainFrontPanel || backBoard) ? 'high' : sideBoard ? 'medium' : 'low';
  const lShapeBoardCount = boardRefs
    .filter(ref => ref.source.lShapeCutoutLengthAMm || ref.source.lShapeCutoutLengthBMm)
    .reduce((sum, ref) => sum + ref.quantity, 0);

  return {
    cabinetWidthMm: cabinetWidth,
    cabinetHeightMm: cabinetHeight,
    cabinetDepthMm: cabinetDepth,
    boardThicknessMm: thickness,
    boardCount: boardRefs.reduce((sum, ref) => sum + ref.quantity, 0),
    sourceConfidence,
    frontPanels,
    shelfCount: quantityByRole(boardRefs, 'SHELF'),
    dividerCount: quantityByRole(boardRefs, 'SEGMENT_DIVIDER'),
    hasBackPanel: boardRefs.some(ref => ref.role === 'BACK'),
    hasTopWreath: boardRefs.some(ref => ref.role === 'TOP_WREATH'),
    hasBottomWreath: boardRefs.some(ref => ref.role === 'BOTTOM_WREATH'),
    lShapeBoardCount,
    footprint: buildFootprint(boardRefs, cabinetWidth, cabinetDepth),
    boards: boardRefs,
    notes: buildNotes(boardRefs, sourceConfidence, lShapeBoardCount)
  };
}

function toTechnicalBoardRef(board: Board): TechnicalBoardRef {
  const role = resolveRole(board.boardName);
  return {
    source: board,
    role,
    label: board.boardNameLabel || board.boardName,
    quantity: Math.max(1, board.quantity ?? 1),
    widthMm: inferBoardWidth(board, role),
    heightMm: inferBoardHeight(board, role),
    thicknessMm: board.boardThickness
  };
}

function resolveRole(boardName: string): TechnicalBoardRole {
  if (boardName === 'SIDE_NAME' || boardName === 'CORNER_PANEL') return 'SIDE';
  if (TOP_WREATH_NAMES.has(boardName)) return 'TOP_WREATH';
  if (BOTTOM_WREATH_NAMES.has(boardName)) return 'BOTTOM_WREATH';
  if (SHELF_NAMES.has(boardName)) return 'SHELF';
  if (BACK_NAMES.has(boardName)) return 'BACK';
  if (FRONT_NAMES.has(boardName)) return 'FRONT';
  if (DRAWER_FRONT_NAMES.has(boardName)) return 'DRAWER_FRONT';
  if (DIVIDER_NAMES.has(boardName)) return 'SEGMENT_DIVIDER';
  return 'OTHER';
}

function inferBoardWidth(board: Board, role: TechnicalBoardRole): number {
  return WIDTH_FROM_SIDE_Y_ROLES.has(role) ? board.sideY : board.sideX;
}

function inferBoardHeight(board: Board, role: TechnicalBoardRole): number {
  return WIDTH_FROM_SIDE_Y_ROLES.has(role) ? board.sideX : board.sideY;
}

function buildFrontPanels(boardRefs: TechnicalBoardRef[]): TechnicalFrontPanel[] {
  return boardRefs
    .filter(ref => ref.role === 'FRONT' || ref.role === 'DRAWER_FRONT')
    .map(ref => ({
      label: ref.label,
      quantity: ref.quantity,
      widthMm: ref.widthMm,
      heightMm: ref.heightMm,
      role: ref.role === 'DRAWER_FRONT' ? 'DRAWER_FRONT' : 'FRONT'
    }));
}

function inferBoardThickness(boardRefs: TechnicalBoardRef[]): number {
  const structural = boardRefs.find(ref => ref.role === 'SIDE' || ref.role === 'BOTTOM_WREATH' || ref.role === 'TOP_WREATH');
  return structural?.thicknessMm ?? boardRefs.find(ref => ref.thicknessMm > 0)?.thicknessMm ?? 18;
}

function inferCabinetWidth(
  boardRefs: TechnicalBoardRef[],
  frontPanels: TechnicalFrontPanel[],
  backBoard: TechnicalBoardRef | undefined,
  thickness: number
): number {
  const structuralOuterWidth = inferStructuralOuterWidth(boardRefs, thickness);
  if (structuralOuterWidth) return structuralOuterWidth;

  if (backBoard?.widthMm) return backBoard.widthMm;

  const frontWidth = inferFrontTotalWidth(frontPanels);
  if (frontWidth) return frontWidth;

  return maxBoardSide(boardRefs.map(ref => ref.source));
}

function inferStructuralOuterWidth(boardRefs: TechnicalBoardRef[], thickness: number): number | null {
  const horizontalInnerWidth = maxPositive(
    ...boardRefs
      .filter(ref => ref.role === 'SHELF' || ref.role === 'BOTTOM_WREATH' || ref.role === 'TOP_WREATH')
      .map(ref => ref.widthMm)
  );

  return horizontalInnerWidth ? horizontalInnerWidth + thickness * 2 : null;
}

function inferFrontTotalWidth(frontPanels: TechnicalFrontPanel[]): number | null {
  return maxPositive(
    ...frontPanels.map(panel =>
      panel.widthMm * (panel.quantity > 1 && panel.role === 'FRONT' ? panel.quantity : 1)
    )
  );
}

function inferCabinetDepth(boardRefs: TechnicalBoardRef[], sideBoard: TechnicalBoardRef | undefined): number {
  const directDepth = sideBoard?.widthMm;
  if (directDepth) {
    return directDepth;
  }

  return maxPositive(
    ...boardRefs
      .filter(ref => ref.role === 'SHELF' || ref.role === 'BOTTOM_WREATH' || ref.role === 'TOP_WREATH')
      .map(ref => ref.heightMm)
  ) ?? maxBoardSide(boardRefs.map(ref => ref.source));
}

function buildFootprint(
  boardRefs: TechnicalBoardRef[],
  cabinetWidth: number,
  cabinetDepth: number
): TechnicalDrawingModel['footprint'] {
  const lShapeBoard = boardRefs.find(ref =>
    ref.source.lShapeCutoutLengthAMm && ref.source.lShapeCutoutLengthBMm
  );

  if (!lShapeBoard) {
    return {
      shape: 'RECTANGLE',
      widthMm: cabinetWidth,
      depthMm: cabinetDepth,
      cutoutWidthMm: null,
      cutoutDepthMm: null
    };
  }

  return {
    shape: 'L_SHAPE',
    widthMm: lShapeBoard.source.sideX,
    depthMm: lShapeBoard.source.sideY,
    cutoutWidthMm: lShapeBoard.source.lShapeCutoutLengthAMm ?? null,
    cutoutDepthMm: lShapeBoard.source.lShapeCutoutLengthBMm ?? null
  };
}

function buildNotes(
  boardRefs: TechnicalBoardRef[],
  confidence: TechnicalDrawingModel['sourceConfidence'],
  lShapeBoardCount: number
): string[] {
  const notes: string[] = [];
  if (confidence !== 'high') {
    notes.push('Model wywnioskowany z BOM bez jawnych pozycji płyt.');
  }
  if (lShapeBoardCount > 0) {
    notes.push(`Zawiera płyty L-shape: ${lShapeBoardCount}.`);
  }

  const otherCount = quantityByRole(boardRefs, 'OTHER');
  if (otherCount > 0) {
    notes.push(`Płyty poza MVP rysunku: ${otherCount}.`);
  }
  return notes;
}

function firstByRole(boardRefs: TechnicalBoardRef[], role: TechnicalBoardRole): TechnicalBoardRef | undefined {
  return boardRefs.find(ref => ref.role === role);
}

function quantityByRole(boardRefs: TechnicalBoardRef[], role: TechnicalBoardRole): number {
  return boardRefs
    .filter(ref => ref.role === role)
    .reduce((sum, ref) => sum + ref.quantity, 0);
}

function hasPositiveDimensions(board: Board): boolean {
  return board.sideX > 0 && board.sideY > 0 && board.boardThickness > 0;
}

function maxPositive(...values: Array<number | null | undefined>): number | null {
  const positives = values.filter((value): value is number => typeof value === 'number' && value > 0);
  return positives.length ? Math.max(...positives) : null;
}

function maxBoardSide(boards: Board[]): number {
  return Math.max(1, ...boards.flatMap(board => [board.sideX, board.sideY]).filter(value => value > 0));
}
