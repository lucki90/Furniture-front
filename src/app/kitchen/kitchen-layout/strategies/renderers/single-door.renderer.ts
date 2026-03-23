import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { createVerticalHandle } from '../cabinet-svg-helpers';

/**
 * Renderuje pojedyncze drzwi.
 * Używane przez: BASE_ONE_DOOR, CORNER_CABINET, UPPER_ONE_DOOR, BASE_DISHWASHER,
 * UPPER_HOOD (FLAP), oraz jako fallback dla nieznanych typów.
 */
export function renderSingleDoor(
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
