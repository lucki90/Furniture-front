import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { createHorizontalHandle } from '../cabinet-svg-helpers';

/**
 * Renderuje szuflady.
 * Używane przez: BASE_WITH_DRAWERS.
 * Liczba szuflad pochodzi z ctx.drawerQuantity (domyślnie 3).
 */
export function renderDrawers(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap, drawerQuantity } = ctx;
  const drawerCount = drawerQuantity || 3;
  const drawerHeight = (bodyHeight - gap * (drawerCount + 1)) / drawerCount;

  for (let i = 0; i < drawerCount; i++) {
    const drawerY = bodyY + gap + i * (drawerHeight + gap);
    fronts.push({
      type: 'DRAWER',
      x: displayX + gap,
      y: drawerY,
      width: displayWidth - gap * 2,
      height: drawerHeight
    });
    handles.push(createHorizontalHandle(
      displayX + displayWidth / 2,
      drawerY + drawerHeight / 2,
      Math.min(displayWidth * 0.4, 15)
    ));
  }
}
