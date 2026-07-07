import { TechnicalDrawingModel } from './technical-drawing.model';
import type {
  DrawingLine,
  DrawingPath,
  DrawingRect,
  DrawingViewLayout,
  TechnicalDrawingLayout
} from './technical-drawing-layout.model';

type InteriorBoardKind = 'shelf' | 'divider';

const LAYOUT_PADDING = 22;
const VIEW_GAP = 54;
const MAX_VIEW_WIDTH = 210;
const MAX_VIEW_HEIGHT = 170;
const LABEL_GUTTER_X = 28;
const TITLE_GUTTER_Y = 26;
const SVG_RIGHT_GUTTER = 36;
const SVG_BOTTOM_GUTTER = 52;
const MIN_VIEW_WIDTH = 80;
const MIN_FRONT_HEIGHT = 120;
const TITLE_OFFSET_Y = 12;
const DIM_LINE_OFFSET = 18;
const DIM_TEXT_OFFSET_Y = 34;
const DIM_TEXT_GUTTER_X = 29;
const MIN_FRONT_EDGE_PX = 3;
const BACK_PANEL_THICKNESS_MM = 3;
const MIN_BACK_PANEL_PX = 2;
const FRONT_INSET_PX = 3;
const FRONT_GAP_PX = 6;
const MAX_VISIBLE_INTERIOR_BOARDS = 7;
const MAX_VISIBLE_DRAWER_FRONTS = 8;
const MAX_VISIBLE_DOOR_FRONTS = 4;

const CONFIDENCE_LABELS: Record<TechnicalDrawingModel['sourceConfidence'], string> = {
  high: 'BOM+',
  medium: 'BOM',
  low: 'Szkic'
};

export function buildTechnicalDrawingLayout(model: TechnicalDrawingModel): TechnicalDrawingLayout {
  const elevationScale = Math.min(
    MAX_VIEW_WIDTH / Math.max(model.cabinetWidthMm, model.cabinetDepthMm, 1),
    MAX_VIEW_HEIGHT / Math.max(model.cabinetHeightMm, 1)
  );
  const topScale = Math.min(
    MAX_VIEW_WIDTH / Math.max(model.footprint.widthMm, 1),
    MAX_VIEW_HEIGHT / Math.max(model.footprint.depthMm, 1)
  );

  const frontWidth = Math.max(MIN_VIEW_WIDTH, Math.round(model.cabinetWidthMm * elevationScale));
  const frontHeight = Math.max(MIN_FRONT_HEIGHT, Math.round(model.cabinetHeightMm * elevationScale));
  const sideWidth = Math.max(MIN_VIEW_WIDTH, Math.round(model.cabinetDepthMm * elevationScale));
  const sideHeight = frontHeight;
  const topWidth = Math.max(MIN_VIEW_WIDTH, Math.round(model.footprint.widthMm * topScale));
  const topHeight = Math.max(MIN_VIEW_WIDTH, Math.round(model.footprint.depthMm * topScale));
  const frontX = LAYOUT_PADDING + LABEL_GUTTER_X;
  const viewY = LAYOUT_PADDING + TITLE_GUTTER_Y;
  const sideX = frontX + frontWidth + VIEW_GAP;
  const topX = sideX + sideWidth + VIEW_GAP;
  const svgWidth = topX + topWidth + LAYOUT_PADDING + SVG_RIGHT_GUTTER;
  const svgHeight = viewY + Math.max(frontHeight, sideHeight, topHeight) + SVG_BOTTOM_GUTTER;

  const front = buildFrontView(model, frontX, viewY, frontWidth, frontHeight, elevationScale);
  const side = buildSideView(model, sideX, viewY, sideWidth, sideHeight, elevationScale);
  const top = buildTopView(model, topX, viewY, topWidth, topHeight, topScale);
  const views = [front, side, top];

  return {
    svgWidth,
    svgHeight,
    model,
    confidenceClass: `technical-drawing-confidence--${model.sourceConfidence}`,
    confidenceLabel: CONFIDENCE_LABELS[model.sourceConfidence],
    front,
    side,
    top,
    views
  };
}

function buildFrontView(
  model: TechnicalDrawingModel,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number
): DrawingViewLayout {
  const t = scaledThickness(model, scale);
  const rects: DrawingRect[] = [
    { x, y, width, height, className: 'technical-rect technical-rect--outline', label: 'Korpus' },
    { x, y, width: t, height, className: 'technical-rect technical-rect--carcass', label: 'Bok lewy' },
    { x: x + width - t, y, width: t, height, className: 'technical-rect technical-rect--carcass', label: 'Bok prawy' },
  ];

  if (model.hasTopWreath) {
    rects.push({ x, y, width, height: t, className: 'technical-rect technical-rect--carcass', label: 'Wieniec górny' });
  }
  if (model.hasBottomWreath) {
    rects.push({ x, y: y + height - t, width, height: t, className: 'technical-rect technical-rect--carcass', label: 'Wieniec dolny' });
  }

  const innerX = x + t;
  const innerY = y + t;
  const innerWidth = Math.max(1, width - t * 2);
  const innerHeight = Math.max(1, height - t * 2);
  rects.push(...buildHorizontalBoards(model.shelfCount, innerX, innerY, innerWidth, innerHeight, t, 'Półka', 'shelf'));
  rects.push(...buildHorizontalBoards(model.dividerCount, innerX, innerY, innerWidth, innerHeight, t, 'Przegroda', 'divider'));
  rects.push(...buildFrontPanelRects(model, x, y, width, height));

  return buildView('Widok frontu', x, y, width, height, scale, rects, [], `${model.cabinetWidthMm} mm`, `${model.cabinetHeightMm} mm`);
}

function buildSideView(
  model: TechnicalDrawingModel,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number
): DrawingViewLayout {
  const t = scaledThickness(model, scale);
  const rects: DrawingRect[] = [
    { x, y, width, height, className: 'technical-rect technical-rect--outline', label: 'Przekrój korpusu' },
    { x, y, width, height: t, className: 'technical-rect technical-rect--carcass', label: 'Wieniec górny' },
    { x, y: y + height - t, width, height: t, className: 'technical-rect technical-rect--carcass', label: 'Wieniec dolny' },
  ];

  if (model.hasBackPanel) {
    const backThickness = Math.max(MIN_BACK_PANEL_PX, Math.round(BACK_PANEL_THICKNESS_MM * scale));
    rects.push({
      x: x + width - backThickness,
      y: y + t,
      width: backThickness,
      height: Math.max(1, height - t * 2),
      className: 'technical-rect technical-rect--back',
      label: 'Plecy HDF'
    });
  }

  rects.push(...buildHorizontalBoards(model.shelfCount, x, y + t, width, Math.max(1, height - t * 2), t, 'Półka', 'shelf'));
  rects.push(...buildHorizontalBoards(model.dividerCount, x, y + t, width, Math.max(1, height - t * 2), t, 'Przegroda', 'divider'));

  if (model.frontPanels.length > 0) {
    const frontEdgeOffset = Math.max(MIN_FRONT_EDGE_PX, Math.round(model.boardThicknessMm * scale));
    rects.push({
      x: x - frontEdgeOffset,
      y,
      width: frontEdgeOffset,
      height,
      className: 'technical-rect technical-rect--front-edge',
      label: 'Front'
    });
  }

  return buildView('Przekrój boczny', x, y, width, height, scale, rects, [], `${model.cabinetDepthMm} mm`, `${model.cabinetHeightMm} mm`);
}

function buildTopView(
  model: TechnicalDrawingModel,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number
): DrawingViewLayout {
  if (model.footprint.shape === 'L_SHAPE') {
    const cutoutWidth = clamp(Math.round((model.footprint.cutoutWidthMm ?? 0) * scale), 1, width - 1);
    const cutoutDepth = clamp(Math.round((model.footprint.cutoutDepthMm ?? 0) * scale), 1, height - 1);
    const path = [
      `M ${x} ${y}`,
      `H ${x + width}`,
      `V ${y + height - cutoutDepth}`,
      `H ${x + width - cutoutWidth}`,
      `V ${y + height}`,
      `H ${x}`,
      'Z'
    ].join(' ');

    return buildView(
      'Rzut z góry',
      x,
      y,
      width,
      height,
      scale,
      [],
      [{
        d: path,
        className: 'technical-path technical-path--l-shape',
        label: `Obrys L-shape, wycięcie ${model.footprint.cutoutWidthMm} x ${model.footprint.cutoutDepthMm} mm`
      }],
      `${model.footprint.widthMm} mm`,
      `${model.footprint.depthMm} mm`
    );
  }

  return buildView(
    'Rzut z góry',
    x,
    y,
    width,
    height,
    scale,
    [{ x, y, width, height, className: 'technical-rect technical-rect--top-footprint', label: 'Rzut korpusu' }],
    [],
    `${model.footprint.widthMm} mm`,
    `${model.footprint.depthMm} mm`
  );
}

function buildView(
  title: string,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  rects: DrawingRect[],
  paths: DrawingPath[],
  widthLabel: string,
  heightLabel: string
): DrawingViewLayout {
  const heightLabelX = x - DIM_TEXT_GUTTER_X;
  const heightLabelY = y + height / 2;

  return {
    title,
    x,
    y,
    width,
    height,
    scale,
    titleX: x,
    titleY: y - TITLE_OFFSET_Y,
    rects,
    paths,
    lines: buildDimensionLines(x, y, width, height),
    widthLabel,
    widthLabelX: x + width / 2,
    widthLabelY: y + height + DIM_TEXT_OFFSET_Y,
    heightLabel,
    heightLabelX,
    heightLabelY,
    heightLabelTransform: `rotate(-90 ${heightLabelX} ${heightLabelY})`
  };
}

function buildHorizontalBoards(
  count: number,
  x: number,
  y: number,
  width: number,
  height: number,
  thickness: number,
  label: string,
  kind: InteriorBoardKind
): DrawingRect[] {
  const visibleCount = Math.min(count, MAX_VISIBLE_INTERIOR_BOARDS);
  return Array.from({ length: visibleCount }, (_, index) => {
    const boardY = y + ((index + 1) * height / (visibleCount + 1)) - thickness / 2;
    return {
      x,
      y: boardY,
      width,
      height: thickness,
      className: `technical-rect technical-rect--${kind}`,
      label: `${label} ${index + 1}`
    };
  });
}

function buildFrontPanelRects(
  model: TechnicalDrawingModel,
  x: number,
  y: number,
  width: number,
  height: number
): DrawingRect[] {
  if (model.frontPanels.length === 0) {
    return [];
  }

  const drawerCount = model.frontPanels
    .filter(panel => panel.role === 'DRAWER_FRONT')
    .reduce((sum, panel) => sum + panel.quantity, 0);
  if (drawerCount > 0) {
    const count = Math.min(drawerCount, MAX_VISIBLE_DRAWER_FRONTS);
    return Array.from({ length: count }, (_, index) => ({
      x: x + FRONT_INSET_PX,
      y: y + (index * height / count) + FRONT_INSET_PX,
      width: Math.max(1, width - FRONT_GAP_PX),
      height: Math.max(1, height / count - FRONT_GAP_PX),
      className: 'technical-rect technical-rect--front',
      label: `Front szuflady ${index + 1}`
    }));
  }

  const frontCount = Math.min(
    model.frontPanels.reduce((sum, panel) => sum + panel.quantity, 0),
    MAX_VISIBLE_DOOR_FRONTS
  );
  if (frontCount <= 1) {
    return [{
      x: x + FRONT_INSET_PX,
      y: y + FRONT_INSET_PX,
      width: Math.max(1, width - FRONT_GAP_PX),
      height: Math.max(1, height - FRONT_GAP_PX),
      className: 'technical-rect technical-rect--front',
      label: 'Front'
    }];
  }

  return Array.from({ length: frontCount }, (_, index) => ({
    x: x + (index * width / frontCount) + FRONT_INSET_PX,
    y: y + FRONT_INSET_PX,
    width: Math.max(1, width / frontCount - FRONT_GAP_PX),
    height: Math.max(1, height - FRONT_GAP_PX),
    className: 'technical-rect technical-rect--front',
    label: `Front ${index + 1}`
  }));
}

function buildDimensionLines(x: number, y: number, width: number, height: number): DrawingLine[] {
  return [
    {
      x1: x,
      y1: y + height + DIM_LINE_OFFSET,
      x2: x + width,
      y2: y + height + DIM_LINE_OFFSET,
      className: 'technical-dim-line'
    },
    {
      x1: x - DIM_LINE_OFFSET,
      y1: y,
      x2: x - DIM_LINE_OFFSET,
      y2: y + height,
      className: 'technical-dim-line'
    }
  ];
}

function scaledThickness(model: TechnicalDrawingModel, scale: number): number {
  return Math.max(4, Math.round(model.boardThicknessMm * scale));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
