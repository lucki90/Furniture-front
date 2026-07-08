import { TechnicalDrawingModel } from './technical-drawing.model';
import type { DrawingRect, DrawingText } from './technical-drawing-layout.model';

type FrontPanelItemRole = 'FRONT' | 'DRAWER_FRONT';

interface FrontPanelItem {
  id: string;
  label: string;
  role: FrontPanelItemRole;
  widthMm: number;
  heightMm: number;
}

const FRONT_INSET_PX = 3;
const FRONT_PANEL_GAP_PX = 4;
const MAX_VISIBLE_FRONT_ITEMS = 12;
const MIN_FRONT_DIM_TEXT_WIDTH = 36;
const MIN_FRONT_DIM_TEXT_HEIGHT = 18;

export function buildFrontPanelRects(
  model: TechnicalDrawingModel,
  x: number,
  y: number,
  width: number,
  height: number
): DrawingRect[] {
  const items = expandFrontPanelItems(model);
  if (items.length === 0) {
    return [];
  }

  if (shouldRenderFrontsSideBySide(model, items)) {
    return buildSideBySideFrontRects(items, x, y, width, height);
  }

  return buildStackedFrontRects(items, x, y, width, height);
}

export function buildFrontPanelDimensionTexts(rects: DrawingRect[]): DrawingText[] {
  return rects
    .filter(rect => !!rect.dimensionLabel && rect.width >= MIN_FRONT_DIM_TEXT_WIDTH && rect.height >= MIN_FRONT_DIM_TEXT_HEIGHT)
    .map(rect => ({
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2 + 3,
      value: `${rect.dimensionLabel} mm`,
      className: 'technical-front-dim-text',
      textAnchor: 'middle'
    }));
}

function expandFrontPanelItems(model: TechnicalDrawingModel): FrontPanelItem[] {
  const items: FrontPanelItem[] = [];
  let drawerIndex = 1;
  let frontIndex = 1;

  for (const panel of model.frontPanels) {
    for (let copy = 0; copy < panel.quantity && items.length < MAX_VISIBLE_FRONT_ITEMS; copy++) {
      const isDrawer = panel.role === 'DRAWER_FRONT';
      const sequence = isDrawer ? drawerIndex++ : frontIndex++;
      items.push({
        id: `${isDrawer ? 'drawer' : 'front'}-${items.length + 1}`,
        label: isDrawer ? `Front szuflady ${sequence}` : panel.quantity > 1 ? `Front ${sequence}` : panel.label || 'Front',
        role: panel.role,
        widthMm: panel.widthMm,
        heightMm: panel.heightMm
      });
    }
  }

  return items;
}

function shouldRenderFrontsSideBySide(model: TechnicalDrawingModel, items: FrontPanelItem[]): boolean {
  return model.frontPanels.length === 1
    && model.frontPanels[0].role === 'FRONT'
    && items.length > 1;
}

function buildSideBySideFrontRects(
  items: FrontPanelItem[],
  x: number,
  y: number,
  width: number,
  height: number
): DrawingRect[] {
  const totalWidthMm = sumPositive(items.map(item => item.widthMm)) ?? items.length;
  const gapTotal = FRONT_PANEL_GAP_PX * (items.length - 1);
  const availableWidth = Math.max(1, width - FRONT_INSET_PX * 2 - gapTotal);
  const rectHeight = Math.max(1, height - FRONT_INSET_PX * 2);
  let currentX = x + FRONT_INSET_PX;

  return items.map(item => {
    const rectWidth = Math.max(1, availableWidth * item.widthMm / totalWidthMm);
    const rect = toFrontPanelRect(item, currentX, y + FRONT_INSET_PX, rectWidth, rectHeight);
    currentX += rectWidth + FRONT_PANEL_GAP_PX;
    return rect;
  });
}

function buildStackedFrontRects(
  items: FrontPanelItem[],
  x: number,
  y: number,
  width: number,
  height: number
): DrawingRect[] {
  const totalHeightMm = sumPositive(items.map(item => item.heightMm)) ?? items.length;
  const gapTotal = FRONT_PANEL_GAP_PX * (items.length - 1);
  const availableHeight = Math.max(1, height - FRONT_INSET_PX * 2 - gapTotal);
  const rectWidth = Math.max(1, width - FRONT_INSET_PX * 2);
  let currentY = y + FRONT_INSET_PX;

  return items.map(item => {
    const rectHeight = Math.max(1, availableHeight * item.heightMm / totalHeightMm);
    const rect = toFrontPanelRect(item, x + FRONT_INSET_PX, currentY, rectWidth, rectHeight);
    currentY += rectHeight + FRONT_PANEL_GAP_PX;
    return rect;
  });
}

function toFrontPanelRect(
  item: FrontPanelItem,
  x: number,
  y: number,
  width: number,
  height: number
): DrawingRect {
  const dimensionLabel = `${item.widthMm} x ${item.heightMm}`;
  const className = item.role === 'DRAWER_FRONT'
    ? 'technical-rect technical-rect--front technical-rect--drawer-front'
    : 'technical-rect technical-rect--front';

  return {
    id: item.id,
    x,
    y,
    width,
    height,
    className,
    label: `${item.label}: ${dimensionLabel} mm`,
    selectable: true,
    dimensionLabel
  };
}

function sumPositive(values: number[]): number | null {
  const sum = values.filter(value => value > 0).reduce((total, value) => total + value, 0);
  return sum > 0 ? sum : null;
}
