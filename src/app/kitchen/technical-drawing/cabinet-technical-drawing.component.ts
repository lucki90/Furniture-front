import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CabinetResponse } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { buildTechnicalDrawingModel } from './technical-drawing.builder';
import { TechnicalDrawingModel } from './technical-drawing.model';

interface DrawingRect {
  x: number;
  y: number;
  width: number;
  height: number;
  className: string;
  label: string;
}

interface DrawingLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  className: string;
}

interface DrawingViewLayout {
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rects: DrawingRect[];
  lines: DrawingLine[];
  widthLabel: string;
  heightLabel: string;
}

interface TechnicalDrawingLayout {
  svgWidth: number;
  svgHeight: number;
  model: TechnicalDrawingModel;
  front: DrawingViewLayout;
  side: DrawingViewLayout;
}

type InteriorBoardKind = 'shelf' | 'divider';

@Component({
  selector: 'app-cabinet-technical-drawing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cabinet-technical-drawing.component.html',
  styleUrls: ['./cabinet-technical-drawing.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CabinetTechnicalDrawingComponent {
  readonly result = input<CabinetResponse | null>(null);

  protected readonly drawing = computed(() => buildTechnicalDrawingModel(this.result()?.boards));
  protected readonly layout = computed(() => {
    const model = this.drawing();
    return model ? buildLayout(model) : null;
  });

  protected readonly trackByRect = (_: number, rect: DrawingRect) => `${rect.className}-${rect.x}-${rect.y}-${rect.label}`;
  protected readonly trackByLine = (_: number, line: DrawingLine) => `${line.className}-${line.x1}-${line.y1}-${line.x2}-${line.y2}`;
  protected readonly trackByNote = (index: number) => index;
}

function buildLayout(model: TechnicalDrawingModel): TechnicalDrawingLayout {
  const padding = 22;
  const viewGap = 58;
  const maxViewWidth = 230;
  const maxViewHeight = 180;
  const scale = Math.min(
    maxViewWidth / Math.max(model.cabinetWidthMm, model.cabinetDepthMm, 1),
    maxViewHeight / Math.max(model.cabinetHeightMm, 1)
  );

  const frontWidth = Math.max(80, Math.round(model.cabinetWidthMm * scale));
  const frontHeight = Math.max(120, Math.round(model.cabinetHeightMm * scale));
  const sideWidth = Math.max(80, Math.round(model.cabinetDepthMm * scale));
  const sideHeight = frontHeight;
  const frontX = padding + 28;
  const viewY = padding + 26;
  const sideX = frontX + frontWidth + viewGap;
  const svgWidth = sideX + sideWidth + padding + 36;
  const svgHeight = viewY + frontHeight + 52;

  const front = buildFrontView(model, frontX, viewY, frontWidth, frontHeight, scale);
  const side = buildSideView(model, sideX, viewY, sideWidth, sideHeight, scale);

  return { svgWidth, svgHeight, model, front, side };
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

  return {
    title: 'Widok frontu',
    x,
    y,
    width,
    height,
    scale,
    rects,
    lines: buildDimensionLines(x, y, width, height),
    widthLabel: `${model.cabinetWidthMm} mm`,
    heightLabel: `${model.cabinetHeightMm} mm`
  };
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
    rects.push({
      x: x + width - Math.max(2, Math.round(3 * scale)),
      y: y + t,
      width: Math.max(2, Math.round(3 * scale)),
      height: Math.max(1, height - t * 2),
      className: 'technical-rect technical-rect--back',
      label: 'Plecy HDF'
    });
  }

  rects.push(...buildHorizontalBoards(model.shelfCount, x, y + t, width, Math.max(1, height - t * 2), t, 'Półka', 'shelf'));
  rects.push(...buildHorizontalBoards(model.dividerCount, x, y + t, width, Math.max(1, height - t * 2), t, 'Przegroda', 'divider'));

  if (model.frontPanels.length > 0) {
    const frontEdgeOffset = Math.max(3, Math.round(model.boardThicknessMm * scale));
    rects.push({
      x: x - frontEdgeOffset,
      y,
      width: Math.max(3, Math.round(model.boardThicknessMm * scale)),
      height,
      className: 'technical-rect technical-rect--front-edge',
      label: 'Front'
    });
  }

  return {
    title: 'Przekrój boczny',
    x,
    y,
    width,
    height,
    scale,
    rects,
    lines: buildDimensionLines(x, y, width, height),
    widthLabel: `${model.cabinetDepthMm} mm`,
    heightLabel: `${model.cabinetHeightMm} mm`
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
  const visibleCount = Math.min(count, 7);
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
    const count = Math.min(drawerCount, 8);
    return Array.from({ length: count }, (_, index) => ({
      x: x + 3,
      y: y + (index * height / count) + 3,
      width: Math.max(1, width - 6),
      height: Math.max(1, height / count - 6),
      className: 'technical-rect technical-rect--front',
      label: `Front szuflady ${index + 1}`
    }));
  }

  const frontCount = Math.min(
    model.frontPanels.reduce((sum, panel) => sum + panel.quantity, 0),
    4
  );
  if (frontCount <= 1) {
    return [{
      x: x + 3,
      y: y + 3,
      width: Math.max(1, width - 6),
      height: Math.max(1, height - 6),
      className: 'technical-rect technical-rect--front',
      label: 'Front'
    }];
  }

  return Array.from({ length: frontCount }, (_, index) => ({
    x: x + (index * width / frontCount) + 3,
    y: y + 3,
    width: Math.max(1, width / frontCount - 6),
    height: Math.max(1, height - 6),
    className: 'technical-rect technical-rect--front',
    label: `Front ${index + 1}`
  }));
}

function buildDimensionLines(x: number, y: number, width: number, height: number): DrawingLine[] {
  return [
    { x1: x, y1: y + height + 18, x2: x + width, y2: y + height + 18, className: 'technical-dim-line' },
    { x1: x - 18, y1: y, x2: x - 18, y2: y + height, className: 'technical-dim-line' }
  ];
}

function scaledThickness(model: TechnicalDrawingModel, scale: number): number {
  return Math.max(4, Math.round(model.boardThicknessMm * scale));
}
