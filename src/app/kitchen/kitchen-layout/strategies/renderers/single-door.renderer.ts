import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { createVerticalHandle, resolveFrontInsets } from '../cabinet-svg-helpers';

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
  const { displayX, bodyY, displayWidth, bodyHeight } = ctx;
  const inset = resolveFrontInsets(ctx);
  const frontWidth = displayWidth - inset.x * 2;
  const frontHeight = bodyHeight - inset.y * 2;
  fronts.push({
    type: 'DOOR_SINGLE',
    x: displayX + inset.x,
    y: bodyY + inset.y,
    width: frontWidth,
    height: frontHeight,
    hingesSide: 'LEFT'
  });
  handles.push(createVerticalHandle(
    displayX + inset.x + frontWidth - 4,
    bodyY + inset.y + 3,
    frontHeight - 6
  ));
}
