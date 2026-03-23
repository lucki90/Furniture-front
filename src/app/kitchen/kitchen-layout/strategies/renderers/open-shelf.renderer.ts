import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';

/**
 * Renderuje otwartą półkę (UPPER_OPEN_SHELF).
 * Rysuje obrys szafki bez frontu, z poziomymi liniami półek.
 * Liczba półek pochodzi z ctx.shelfQuantity (domyślnie 2).
 */
export function renderOpenShelf(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  _handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap, shelfQuantity } = ctx;
  const shelves = shelfQuantity || 2;

  // Otwarta szafka — pusty obrys (typ OPEN)
  fronts.push({
    type: 'OPEN',
    x: displayX + gap,
    y: bodyY + gap,
    width: displayWidth - gap * 2,
    height: bodyHeight - gap * 2
  });

  // Poziome linie półek wewnątrz
  const shelfSpacing = (bodyHeight - gap * 2) / (shelves + 1);
  for (let i = 1; i <= shelves; i++) {
    const shelfY = bodyY + gap + i * shelfSpacing;
    fronts.push({
      type: 'SHELF_LINE',
      x: displayX + gap + 1,
      y: shelfY,
      width: displayWidth - gap * 2 - 2,
      height: 1
    });
  }
}
