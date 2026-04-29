import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { createHorizontalHandle, createVerticalHandle } from '../cabinet-svg-helpers';

export function renderCargo(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap, drawerQuantity, cargoVariant } = ctx;

  fronts.push({
    type: 'DOOR_SINGLE',
    x: displayX + gap,
    y: bodyY + gap,
    width: displayWidth - gap * 2,
    height: bodyHeight - gap * 2,
    hingesSide: 'LEFT'
  });

  if (cargoVariant === 'DRAWERS' && (drawerQuantity ?? 0) > 0) {
    const innerHeight = bodyHeight - gap * 2;
    const rowCount = drawerQuantity ?? 3;
    const rowHeight = innerHeight / rowCount;

    for (let i = 1; i < rowCount; i++) {
      const lineY = bodyY + gap + rowHeight * i;
      fronts.push({
        type: 'DRAWER',
        x: displayX + gap + 2,
        y: lineY - 0.5,
        width: displayWidth - gap * 2 - 4,
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
    displayX + displayWidth - gap - 4,
    bodyY + gap + 3,
    bodyHeight - gap * 2 - 6
  ));
}
