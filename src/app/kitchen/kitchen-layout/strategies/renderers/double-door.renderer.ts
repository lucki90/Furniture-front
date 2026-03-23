import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { createVerticalHandle } from '../cabinet-svg-helpers';

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

  // Uchwyt na lewych drzwiach — przy środku szafki (prawa strona lewych drzwi)
  handles.push(createVerticalHandle(
    displayX + gap + doorWidth - 3,
    bodyY + gap + 3,
    bodyHeight - gap * 2 - 6
  ));

  // Uchwyt na prawych drzwiach — przy środku szafki (lewa strona prawych drzwi)
  handles.push(createVerticalHandle(
    displayX + gap + doorWidth + gap + 3,
    bodyY + gap + 3,
    bodyHeight - gap * 2 - 6
  ));
}
