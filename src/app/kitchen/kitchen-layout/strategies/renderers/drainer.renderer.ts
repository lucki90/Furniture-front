import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { createVerticalHandle } from '../cabinet-svg-helpers';

/**
 * SVG renderer dla szafki wiszącej z ociekaczem (UPPER_DRAINER).
 *
 * Warianty frontu:
 * - OPEN (0 frontów):    brak frontu — poziome linie sugerujące drut ociekacza
 * - ONE_DOOR (1 front):  pojedyncze drzwi z uchwytem
 * - TWO_DOORS (2 fronty): dwoje drzwi z uchwytami
 *
 * Dno otwarte (brak wieńca dolnego) — woda spływa do zlewu.
 * Wizualnie: cienka przerywana linia u dołu korpusu podkreśla otwarte dno.
 */
export function renderDrainer(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const frontCount = fronts.length;

  if (frontCount === 0) {
    renderOpenDrainer(ctx, fronts);
  } else if (frontCount === 1) {
    renderSingleDoorDrainer(ctx, fronts, handles);
  } else {
    renderDoubleDoorDrainer(ctx, fronts, handles);
  }
}

/** OPEN — brak frontu, poziome linie ociekacza */
function renderOpenDrainer(ctx: CabinetRenderContext, fronts: DisplayFront[]): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap } = ctx;
  const innerX = displayX + gap;
  const innerW = displayWidth - gap * 2;
  const innerY = bodyY + gap;
  const innerH = bodyHeight - gap * 2;

  // 3 poziome linie sugerujące drut ociekacza
  const lineCount = 3;
  const step = Math.floor(innerH / (lineCount + 1));
  for (let i = 1; i <= lineCount; i++) {
    const lineY = innerY + i * step;
    fronts.push({
      type: 'SHELF_LINE',
      x: innerX,
      y: lineY,
      width: innerW,
      height: 1,
      hingesSide: undefined
    });
  }
}

/** ONE_DOOR — pojedyncze drzwi */
function renderSingleDoorDrainer(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap } = ctx;
  fronts.push({
    type: 'DOOR_SINGLE',
    x: displayX + gap,
    y: bodyY + gap,
    width: displayWidth - gap * 2,
    height: bodyHeight - gap * 2,
    hingesSide: 'LEFT'
  });
  handles.push(createVerticalHandle(
    displayX + displayWidth - gap - 4,
    bodyY + gap + 3,
    bodyHeight - gap * 2 - 6
  ));
}

/** TWO_DOORS — dwoje drzwi */
function renderDoubleDoorDrainer(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap } = ctx;
  const doorWidth = (displayWidth - gap * 3) / 2;

  // Lewe drzwi
  fronts.push({
    type: 'DOOR_SINGLE',
    x: displayX + gap,
    y: bodyY + gap,
    width: doorWidth,
    height: bodyHeight - gap * 2,
    hingesSide: 'LEFT'
  });

  // Prawe drzwi
  fronts.push({
    type: 'DOOR_SINGLE',
    x: displayX + gap + doorWidth + gap,
    y: bodyY + gap,
    width: doorWidth,
    height: bodyHeight - gap * 2,
    hingesSide: 'RIGHT'
  });

  // Uchwyt na lewych drzwiach — przy środku szafki
  handles.push(createVerticalHandle(
    displayX + gap + doorWidth - 3,
    bodyY + gap + 3,
    bodyHeight - gap * 2 - 6
  ));

  // Uchwyt na prawych drzwiach — przy środku szafki
  handles.push(createVerticalHandle(
    displayX + gap + doorWidth + gap + 3,
    bodyY + gap + 3,
    bodyHeight - gap * 2 - 6
  ));
}
