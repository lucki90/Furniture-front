import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { createVerticalHandle, createHorizontalHandle } from '../cabinet-svg-helpers';
import { SegmentFormData, SegmentType, SegmentFrontType } from '../../../cabinet-form/model/segment.model';

/**
 * Renderuje segmenty słupka kuchennego (TALL_CABINET).
 * Segmenty są rysowane proporcjonalnie do ich wysokości w mm.
 * Obsługiwane typy segmentów: DOOR, DRAWER, OPEN_SHELF, OVEN, MICROWAVE.
 * Jeśli brak segmentów — domyślnie 3 sekcje (2 drzwi + szuflady).
 */
export function renderTallCabinet(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap } = ctx;
  let segments = ctx.segments;

  if (!segments || segments.length === 0) {
    // Domyślnie 3 sekcje jeśli brak danych
    const defaultSegments: SegmentFormData[] = [
      { segmentType: SegmentType.DOOR, height: 600, orderIndex: 0, frontType: SegmentFrontType.ONE_DOOR },
      { segmentType: SegmentType.DOOR, height: 600, orderIndex: 1, frontType: SegmentFrontType.ONE_DOOR },
      { segmentType: SegmentType.DRAWER, height: 400, orderIndex: 2, drawerQuantity: 2 }
    ];
    segments = defaultSegments;
  }

  // Sortuj segmenty po orderIndex
  const sortedSegments = [...segments].sort((a, b) => a.orderIndex - b.orderIndex);

  // Skaluj do dostępnej wysokości w px
  const totalSegmentHeight = sortedSegments.reduce((sum, s) => sum + s.height, 0);
  const scale = bodyHeight / totalSegmentHeight;

  let currentY = bodyY + gap;

  for (const segment of sortedSegments) {
    const segmentHeightPx = segment.height * scale - gap;

    switch (segment.segmentType) {
      case SegmentType.DRAWER: {
        const drawerCount = segment.drawerQuantity || 2;
        const drawerHeight = (segmentHeightPx - gap * (drawerCount - 1)) / drawerCount;
        for (let i = 0; i < drawerCount; i++) {
          const drawerY = currentY + i * (drawerHeight + gap);
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
            Math.min(displayWidth * 0.4, 12)
          ));
        }
        break;
      }

      case SegmentType.DOOR:
        if (segment.frontType === SegmentFrontType.TWO_DOORS) {
          const doorWidth = (displayWidth - gap * 3) / 2;
          fronts.push(
            { type: 'DOOR_SINGLE', x: displayX + gap, y: currentY, width: doorWidth, height: segmentHeightPx, hingesSide: 'LEFT' },
            { type: 'DOOR_SINGLE', x: displayX + gap + doorWidth + gap, y: currentY, width: doorWidth, height: segmentHeightPx, hingesSide: 'RIGHT' }
          );
          handles.push(
            createVerticalHandle(displayX + gap + doorWidth - 3, currentY + 3, segmentHeightPx - 6),
            createVerticalHandle(displayX + gap + doorWidth + gap + 3, currentY + 3, segmentHeightPx - 6)
          );
        } else {
          fronts.push({ type: 'DOOR_SINGLE', x: displayX + gap, y: currentY, width: displayWidth - gap * 2, height: segmentHeightPx, hingesSide: 'LEFT' });
          handles.push(createVerticalHandle(displayX + displayWidth - gap - 4, currentY + 3, segmentHeightPx - 6));
        }
        break;

      case SegmentType.OPEN_SHELF:
        fronts.push({ type: 'OPEN', x: displayX + gap, y: currentY, width: displayWidth - gap * 2, height: segmentHeightPx });
        break;

      case SegmentType.OVEN:
      case SegmentType.MICROWAVE:
        // Wnęka AGD — srebrno-szary kolor (typ 'APPLIANCE')
        fronts.push({ type: 'APPLIANCE', x: displayX + gap, y: currentY, width: displayWidth - gap * 2, height: segmentHeightPx });
        break;
    }

    currentY += segmentHeightPx + gap;
  }
}
