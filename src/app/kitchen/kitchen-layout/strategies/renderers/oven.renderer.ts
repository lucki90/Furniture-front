import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { createVerticalHandle, createHorizontalHandle } from '../cabinet-svg-helpers';

/**
 * Renderuje piekarnik wbudowany (BASE_OVEN).
 * Struktura (od góry):
 *  - blenda dekoracyjna (opcjonalna, DOOR_SINGLE)
 *  - wnęka piekarnika (APPLIANCE — szaro-srebrna)
 *  - sekcja dolna: szuflada (DRAWER) | drzwi (DOOR_SINGLE) | brak (NONE)
 * Separator między wnęką a sekcją dolną jest rysowany w HTML jako osobna linia (ovenSeparatorDisplayY).
 */
export function renderOven(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap, scaleVert: sv, ovenConfig } = ctx;
  const T = 18; // grubość płyty — ta sama stała co po stronie Java
  const apronH = ovenConfig?.ovenApronEnabled ? (ovenConfig?.ovenApronHeightMm ?? 0) : 0;
  const ovenSlotH = ovenConfig?.ovenHeightType === 'COMPACT' ? 455 : 595;
  const lowerSectionType = ovenConfig?.ovenLowerSectionType ?? 'NONE';

  const apronDisplayH = Math.round(apronH * sv);
  const ovenSlotDisplayH = Math.round(ovenSlotH * sv);

  // Blenda dekoracyjna (opcjonalna) — nad wnęką piekarnika
  if (apronH > 0 && apronDisplayH > gap) {
    fronts.push({
      type: 'DOOR_SINGLE',
      x: displayX + gap,
      y: bodyY + gap,
      width: displayWidth - gap * 2,
      height: apronDisplayH - gap,
      hingesSide: 'LEFT'
    });
  }

  // Wnęka piekarnika — szaro-srebrna (APPLIANCE)
  const ovenSlotY = bodyY + Math.round(T * sv) + apronDisplayH;
  fronts.push({
    type: 'APPLIANCE',
    x: displayX + gap,
    y: ovenSlotY,
    width: displayWidth - gap * 2,
    height: ovenSlotDisplayH
  });

  // Sekcja dolna: szuflada lub drzwi
  const lowerStartPx = bodyY + Math.round((T + apronH + ovenSlotH + T) * sv);
  const lowerH = bodyY + bodyHeight - gap - lowerStartPx;

  if (lowerSectionType !== 'NONE' && lowerH > gap * 2) {
    if (lowerSectionType === 'LOW_DRAWER') {
      fronts.push({
        type: 'DRAWER',
        x: displayX + gap,
        y: lowerStartPx,
        width: displayWidth - gap * 2,
        height: lowerH
      });
      handles.push(createHorizontalHandle(
        displayX + displayWidth / 2,
        lowerStartPx + lowerH / 2,
        Math.min(displayWidth * 0.4, 15)
      ));
    } else if (lowerSectionType === 'HINGED_DOOR') {
      fronts.push({
        type: 'DOOR_SINGLE',
        x: displayX + gap,
        y: lowerStartPx,
        width: displayWidth - gap * 2,
        height: lowerH,
        hingesSide: 'LEFT'
      });
      handles.push(createVerticalHandle(
        displayX + displayWidth - gap - 4,
        lowerStartPx + 3,
        lowerH - 6
      ));
    }
  }
}
