import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { createHorizontalHandle, createVerticalHandle, resolveFrontInsets } from '../cabinet-svg-helpers';

export function renderCargo(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap, drawerQuantity, cargoVariant } = ctx;
  const inset = resolveFrontInsets(ctx);

  fronts.push({
    type: 'DOOR_SINGLE',
    x: displayX + inset.x,
    y: bodyY + inset.y,
    width: displayWidth - inset.x * 2,
    height: bodyHeight - inset.y * 2,
    hingesSide: 'LEFT'
  });

  if (cargoVariant === 'DRAWERS' && (drawerQuantity ?? 0) > 0) {
    const innerHeight = bodyHeight - inset.y * 2;
    const rowCount = drawerQuantity ?? 3;
    const rowHeight = innerHeight / rowCount;

    for (let i = 1; i < rowCount; i++) {
      const lineY = bodyY + inset.y + rowHeight * i;
      fronts.push({
        type: 'DRAWER',
        x: displayX + inset.x + 2,
        y: lineY - 0.5,
        width: displayWidth - inset.x * 2 - 4,
        height: 1
      });
    }

    handles.push(createHorizontalHandle(
      displayX + displayWidth / 2,
      bodyY + bodyHeight / 2,
      Math.min(displayWidth * 0.4, 15)
    ));
    return;
  }

  handles.push(createVerticalHandle(
    displayX + displayWidth - inset.x - 4,
    bodyY + inset.y + 3,
    bodyHeight - inset.y * 2 - 6
  ));
}
