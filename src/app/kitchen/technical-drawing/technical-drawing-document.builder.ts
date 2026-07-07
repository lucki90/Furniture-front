import { KitchenCabinet, WallWithCabinets } from '../model/kitchen-state.model';
import { WALL_TYPES } from '../model/kitchen-project.model';
import { buildTechnicalDrawingModel } from './technical-drawing.builder';
import { TechnicalBoardRef, TechnicalDrawingModel } from './technical-drawing.model';
import {
  TechnicalDrawingDocument,
  TechnicalDrawingDocumentBoard,
  TechnicalDrawingDocumentCabinet,
  TechnicalDrawingDocumentItem,
  TechnicalDrawingDocumentModel,
  TechnicalDrawingDocumentTotals,
  TechnicalDrawingDocumentWall,
  TechnicalDrawingSkipReason,
  TechnicalDrawingSkippedCabinet
} from './technical-drawing-document.model';

export function buildTechnicalDrawingDocument(walls: WallWithCabinets[] | null | undefined): TechnicalDrawingDocument {
  const safeWalls = walls ?? [];
  const drawings: TechnicalDrawingDocumentItem[] = [];
  const skippedCabinets: TechnicalDrawingSkippedCabinet[] = [];

  safeWalls.forEach((wall, wallIndex) => {
    const wallMeta = toDocumentWall(wall, wallIndex);
    wall.cabinets.forEach((cabinet, cabinetIndex) => {
      const cabinetMeta = toDocumentCabinet(cabinet, cabinetIndex);
      const drawingModel = buildTechnicalDrawingModel(cabinet.calculationResponse?.boards);

      if (!drawingModel) {
        skippedCabinets.push(toSkippedCabinet(wallMeta, cabinetMeta, cabinet, resolveSkipReason(cabinet)));
        return;
      }

      drawings.push({
        wall: wallMeta,
        cabinet: cabinetMeta,
        drawing: toDocumentModel(drawingModel)
      });
    });
  });

  return {
    schemaVersion: 1,
    totals: buildTotals(safeWalls, drawings, skippedCabinets),
    drawings,
    skippedCabinets
  };
}

function toDocumentWall(wall: WallWithCabinets, wallIndex: number): TechnicalDrawingDocumentWall {
  return {
    id: wall.id,
    type: wall.type,
    label: WALL_TYPES.find(type => type.value === wall.type)?.label ?? `Ściana ${wallIndex + 1}`,
    order: wallIndex + 1,
    widthMm: wall.widthMm,
    heightMm: wall.heightMm,
    islandDepthMm: wall.islandDepthMm ?? null
  };
}

function toDocumentCabinet(cabinet: KitchenCabinet, cabinetIndex: number): TechnicalDrawingDocumentCabinet {
  return {
    id: cabinet.id,
    type: cabinet.type,
    label: cabinet.name || `Szafka ${cabinetIndex + 1}`,
    order: cabinetIndex + 1,
    side: cabinet.cabinetSide ?? null,
    widthMm: cabinet.width,
    heightMm: cabinet.height,
    depthMm: cabinet.depth,
    positionY: cabinet.positionY
  };
}

function toDocumentModel(model: TechnicalDrawingModel): TechnicalDrawingDocumentModel {
  return {
    cabinetWidthMm: model.cabinetWidthMm,
    cabinetHeightMm: model.cabinetHeightMm,
    cabinetDepthMm: model.cabinetDepthMm,
    boardThicknessMm: model.boardThicknessMm,
    boardCount: model.boardCount,
    sourceConfidence: model.sourceConfidence,
    frontPanels: [...model.frontPanels],
    shelfCount: model.shelfCount,
    dividerCount: model.dividerCount,
    hasBackPanel: model.hasBackPanel,
    hasTopWreath: model.hasTopWreath,
    hasBottomWreath: model.hasBottomWreath,
    lShapeBoardCount: model.lShapeBoardCount,
    footprint: { ...model.footprint },
    notes: [...model.notes],
    boards: model.boards.map(toDocumentBoard)
  };
}

function toDocumentBoard(boardRef: TechnicalBoardRef): TechnicalDrawingDocumentBoard {
  return {
    boardName: boardRef.source.boardName,
    role: boardRef.role,
    label: boardRef.label,
    quantity: boardRef.quantity,
    widthMm: boardRef.widthMm,
    heightMm: boardRef.heightMm,
    thicknessMm: boardRef.thicknessMm,
    sourceSideX: boardRef.source.sideX,
    sourceSideY: boardRef.source.sideY,
    lShapeCutoutLengthAMm: boardRef.source.lShapeCutoutLengthAMm ?? null,
    lShapeCutoutLengthBMm: boardRef.source.lShapeCutoutLengthBMm ?? null
  };
}

function toSkippedCabinet(
  wall: TechnicalDrawingDocumentWall,
  cabinetMeta: TechnicalDrawingDocumentCabinet,
  cabinet: KitchenCabinet,
  reason: TechnicalDrawingSkipReason
): TechnicalDrawingSkippedCabinet {
  return {
    wallId: wall.id,
    wallLabel: wall.label,
    cabinetId: cabinet.id,
    cabinetLabel: cabinetMeta.label,
    cabinetType: cabinet.type,
    reason
  };
}

function resolveSkipReason(cabinet: KitchenCabinet): TechnicalDrawingSkipReason {
  if (!cabinet.calculationResponse) {
    return 'NO_CALCULATION_RESPONSE';
  }
  if (cabinet.calculationResponse.boards.length === 0) {
    return 'NO_BOARDS';
  }
  return 'NO_DRAWABLE_BOARDS';
}

function buildTotals(
  walls: WallWithCabinets[],
  drawings: TechnicalDrawingDocumentItem[],
  skippedCabinets: TechnicalDrawingSkippedCabinet[]
): TechnicalDrawingDocumentTotals {
  return {
    wallCount: walls.length,
    cabinetCount: walls.reduce((sum, wall) => sum + wall.cabinets.length, 0),
    drawingCount: drawings.length,
    skippedCabinetCount: skippedCabinets.length,
    highConfidenceCount: countByConfidence(drawings, 'high'),
    mediumConfidenceCount: countByConfidence(drawings, 'medium'),
    lowConfidenceCount: countByConfidence(drawings, 'low')
  };
}

function countByConfidence(
  drawings: TechnicalDrawingDocumentItem[],
  confidence: TechnicalDrawingModel['sourceConfidence']
): number {
  return drawings.filter(item => item.drawing.sourceConfidence === confidence).length;
}
