import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { createVerticalHandle, resolveFrontInsets } from '../cabinet-svg-helpers';

/**
 * Renderuje podwójne drzwi (lewe + prawe).
 * Używane przez: BASE_TWO_DOOR, UPPER_TWO_DOOR.
 */
export function renderDoubleDoor(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap } = ctx;
  const inset = resolveFrontInsets(ctx);
  const firstDoorX = displayX + inset.x;
  const frontHeight = bodyHeight - inset.y * 2;
  const doorWidth = (displayWidth - inset.x * 2 - gap) / 2;

  // Lewe drzwi
  fronts.push({
    type: 'DOOR_SINGLE',
    x: firstDoorX,
    y: bodyY + inset.y,
    width: doorWidth,
    height: frontHeight,
    hingesSide: 'LEFT'
  });

  // Prawe drzwi
  fronts.push({
    type: 'DOOR_SINGLE',
    x: firstDoorX + doorWidth + gap,
    y: bodyY + inset.y,
    width: doorWidth,
    height: frontHeight,
    hingesSide: 'RIGHT'
  });

  // Uchwyt na lewych drzwiach — przy środku szafki (prawa strona lewych drzwi)
  handles.push(createVerticalHandle(
    firstDoorX + doorWidth - 3,
    bodyY + inset.y + 3,
    frontHeight - 6
  ));

  // Uchwyt na prawych drzwiach — przy środku szafki (lewa strona prawych drzwi)
  handles.push(createVerticalHandle(
    firstDoorX + doorWidth + gap + 3,
    bodyY + inset.y + 3,
    frontHeight - 6
  ));
}
