import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { renderDoubleDoor } from './double-door.renderer';
import { renderSingleDoor } from './single-door.renderer';

/**
 * Renderuje portal przejscia do spizarni bez podzialow klasycznego korpusu.
 * Pelnowysokosciowe drzwi korzystaja ze wspolnych prymitywow frontow, a osobna
 * linia pokazuje zalamanie cokolu przymocowanego bezposrednio do skrzydla.
 */
export function renderPantryPassage(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  if (ctx.pantryPassageFrontType === 'ONE_DOOR') {
    renderSingleDoor(ctx, fronts, handles);
  } else {
    renderDoubleDoor(ctx, fronts, handles);
  }

  const plinthHeightPx = Math.max(0, ctx.pantryAttachedPlinthHeightPx ?? 0);
  if (plinthHeightPx <= 0) {
    return;
  }

  const gap = ctx.frontGap;
  fronts.push({
    type: 'PLINTH_BREAK_LINE',
    x: ctx.displayX + gap + 1,
    y: ctx.bodyY + ctx.bodyHeight - plinthHeightPx,
    width: Math.max(0, ctx.displayWidth - gap * 2 - 2),
    height: 1
  });
}
