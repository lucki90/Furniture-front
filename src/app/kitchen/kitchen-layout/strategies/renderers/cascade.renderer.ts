import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { createVerticalHandle } from '../cabinet-svg-helpers';
import { CASCADE_LOWER_HEIGHT_DEFAULT_MM, CASCADE_UPPER_DEPTH_DEFAULT_MM } from '../../kitchen-layout.constants';

/**
 * Renderuje szafkę kaskadową (UPPER_CASCADE).
 * Dwa segmenty o różnych głębokościach:
 *  - górny segment (płytszy, cascadeUpperHeight) — rysowany na górze, drzwi
 *  - dolny segment (głębszy, cascadeLowerHeight) — rysowany poniżej, drzwi
 */
export function renderCascade(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap, cascadeLowerHeight, cascadeUpperHeight } = ctx;
  const lower = cascadeLowerHeight ?? CASCADE_LOWER_HEIGHT_DEFAULT_MM;
  const upper = cascadeUpperHeight ?? CASCADE_UPPER_DEPTH_DEFAULT_MM;
  const total = lower + upper;

  const lowerHeightPx = Math.round((lower / total) * bodyHeight);
  const upperHeightPx = bodyHeight - lowerHeightPx;

  // Górny segment (płytszy) — rysowany na górze
  const upperY = bodyY + gap;
  const upperH = upperHeightPx - gap;
  fronts.push({
    type: 'DOOR_SINGLE',
    x: displayX + gap,
    y: upperY,
    width: displayWidth - gap * 2,
    height: upperH,
    hingesSide: 'LEFT'
  });
  handles.push(createVerticalHandle(
    displayX + displayWidth - gap - 4,
    upperY + 3,
    upperH - 6
  ));

  // Dolny segment (głębszy) — rysowany poniżej, z linią oddzielającą
  const lowerY = bodyY + upperHeightPx + gap;
  const lowerH = lowerHeightPx - gap * 2;
  fronts.push({
    type: 'DOOR_SINGLE',
    x: displayX + gap,
    y: lowerY,
    width: displayWidth - gap * 2,
    height: lowerH,
    hingesSide: 'LEFT'
  });
  handles.push(createVerticalHandle(
    displayX + displayWidth - gap - 4,
    lowerY + 3,
    lowerH - 6
  ));
}
