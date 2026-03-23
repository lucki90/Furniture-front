import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';

/**
 * Renderuje lodówkę wolnostojącą (BASE_FRIDGE_FREESTANDING).
 * Korpus ma kolor AGD (srebrny) nadawany przez klasę CSS cabinet-appliance-freestanding.
 * Dodaje jedynie linie podziału dla TWO_DOORS i SIDE_BY_SIDE:
 *  - SINGLE_DOOR: tylko srebrny prostokąt (brak elementów dodatkowych)
 *  - TWO_DOORS: pozioma linia podziału na ~2/3 wysokości od góry (zamrażarka u dołu)
 *  - SIDE_BY_SIDE: pionowa linia w połowie szerokości (dwa osobne sektory)
 */
export function renderFridgeFreestanding(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  _handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap, fridgeConfig } = ctx;
  const type = fridgeConfig?.fridgeFreestandingType;

  if (!type || type === 'SINGLE_DOOR') {
    return; // Tylko srebrny prostokąt — brak elementów dodatkowych
  }

  if (type === 'TWO_DOORS') {
    // Pozioma linia podziału na ~2/3 wysokości od góry (zamrażarka u dołu)
    const splitY = bodyY + Math.round(bodyHeight * 2 / 3);
    fronts.push({
      type: 'SHELF_LINE',
      x: displayX + gap,
      y: splitY,
      width: displayWidth - gap * 2,
      height: 1
    });
  } else if (type === 'SIDE_BY_SIDE') {
    // Pionowa linia w połowie szerokości (dwa osobne sektory)
    fronts.push({
      type: 'VERT_DIVIDER',
      x: displayX + displayWidth / 2,
      y: bodyY + gap,
      width: 0,
      height: bodyHeight - gap * 2
    });
  }
}
