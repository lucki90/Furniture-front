import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { createVerticalHandle, createHorizontalHandle, resolveFrontInsets } from '../cabinet-svg-helpers';
import { SegmentFormData, SegmentType, SegmentFrontType } from '../../../cabinet-form/model/segment.model';
import { TALL_SEGMENT_DOOR_DEFAULT_MM, TALL_SEGMENT_DRAWER_DEFAULT_MM } from '../../kitchen-layout.constants';

/**
 * Renderuje segmenty słupka kuchennego (TALL_CABINET).
 * Segmenty są rysowane proporcjonalnie do ich wysokości w mm.
 * Obsługiwane typy segmentów: DOOR (drzwi, klapa do góry albo w dół), DRAWER, OPEN_SHELF, OVEN, MICROWAVE,
 * DISHWASHER.
 * Jeśli brak segmentów — domyślnie 3 sekcje (2 drzwi + szuflady).
 */
export function renderTallCabinet(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap } = ctx;
  const inset = resolveFrontInsets(ctx);
  const isInset = ctx.frontMountingType === 'INSET';
  let segments = ctx.segments;

  if (!segments || segments.length === 0) {
    // Domyślnie 3 sekcje jeśli brak danych
    const defaultSegments: SegmentFormData[] = [
      { segmentType: SegmentType.DOOR, height: TALL_SEGMENT_DOOR_DEFAULT_MM, orderIndex: 0, frontType: SegmentFrontType.ONE_DOOR },
      { segmentType: SegmentType.DOOR, height: TALL_SEGMENT_DOOR_DEFAULT_MM, orderIndex: 1, frontType: SegmentFrontType.ONE_DOOR },
      { segmentType: SegmentType.DRAWER, height: TALL_SEGMENT_DRAWER_DEFAULT_MM, orderIndex: 2, drawerQuantity: 2 }
    ];
    segments = defaultSegments;
  }

  // Sortuj segmenty po orderIndex
  const sortedSegments = [...segments].sort((a, b) => a.orderIndex - b.orderIndex);

  // Skaluj do dostępnej wysokości w px
  const totalSegmentHeight = sortedSegments.reduce((sum, s) => sum + s.height, 0);
  const scale = bodyHeight / totalSegmentHeight;

  let currentSegmentY = bodyY;

  for (let segmentIndex = 0; segmentIndex < sortedSegments.length; segmentIndex++) {
    const segment = sortedSegments[segmentIndex];
    const rawSegmentHeightPx = segment.height * scale;
    const topCarcassEdge = isInset && segmentIndex === 0 ? ctx.carcassEdgeY : 0;
    const bottomCarcassEdge = isInset ? ctx.carcassEdgeY : 0;
    const currentY = currentSegmentY + topCarcassEdge + gap;
    const segmentHeightPx = isInset
      ? rawSegmentHeightPx - topCarcassEdge - bottomCarcassEdge - gap * 2
      : rawSegmentHeightPx - gap;
    const frontX = displayX + inset.x;
    const frontWidth = displayWidth - inset.x * 2;

    switch (segment.segmentType) {
      case SegmentType.DRAWER: {
        const drawerCount = segment.drawerQuantity || 2;
        const drawerHeight = (segmentHeightPx - gap * (drawerCount - 1)) / drawerCount;
        for (let i = 0; i < drawerCount; i++) {
          const drawerY = currentY + i * (drawerHeight + gap);
          fronts.push({
            type: 'DRAWER',
            x: frontX,
            y: drawerY,
            width: frontWidth,
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
        if (segment.frontType === SegmentFrontType.UPWARDS) {
          // Klapa do góry — jeden front, uchwyt przy dolnej krawędzi
          fronts.push({ type: 'DOOR_SINGLE', x: frontX, y: currentY, width: frontWidth, height: segmentHeightPx });
          handles.push(createHorizontalHandle(
            displayX + displayWidth / 2,
            currentY + segmentHeightPx - 3,
            Math.min(frontWidth / 2 - 2, 12)
          ));
        } else if (segment.frontType === SegmentFrontType.DOWNWARDS) {
          // Klapa w dół — jeden front, uchwyt przy górnej krawędzi
          fronts.push({ type: 'DOOR_SINGLE', x: frontX, y: currentY, width: frontWidth, height: segmentHeightPx });
          handles.push(createHorizontalHandle(
            displayX + displayWidth / 2,
            currentY + 3,
            Math.min(frontWidth / 2 - 2, 12)
          ));
        } else if (segment.frontType === SegmentFrontType.TWO_DOORS) {
          const doorWidth = (frontWidth - gap) / 2;
          fronts.push(
            { type: 'DOOR_SINGLE', x: frontX, y: currentY, width: doorWidth, height: segmentHeightPx, hingesSide: 'LEFT' },
            { type: 'DOOR_SINGLE', x: frontX + doorWidth + gap, y: currentY, width: doorWidth, height: segmentHeightPx, hingesSide: 'RIGHT' }
          );
          handles.push(
            createVerticalHandle(frontX + doorWidth - 3, currentY + 3, segmentHeightPx - 6),
            createVerticalHandle(frontX + doorWidth + gap + 3, currentY + 3, segmentHeightPx - 6)
          );
        } else {
          fronts.push({ type: 'DOOR_SINGLE', x: frontX, y: currentY, width: frontWidth, height: segmentHeightPx, hingesSide: 'LEFT' });
          handles.push(createVerticalHandle(displayX + displayWidth - inset.x - 4, currentY + 3, segmentHeightPx - 6));
        }
        break;

      case SegmentType.OPEN_SHELF:
        fronts.push({ type: 'OPEN', x: frontX, y: currentY, width: frontWidth, height: segmentHeightPx });
        break;

      case SegmentType.OVEN:
      case SegmentType.MICROWAVE:
        // Wnęka AGD — srebrno-szary kolor (typ 'APPLIANCE')
        fronts.push({ type: 'APPLIANCE', x: frontX, y: currentY, width: frontWidth, height: segmentHeightPx });
        break;

      case SegmentType.DISHWASHER:
        // Front na drzwiach zmywarki — otwierany w dół, uchwyt przy górnej krawędzi
        fronts.push({ type: 'DOOR_SINGLE', x: frontX, y: currentY, width: frontWidth, height: segmentHeightPx });
        handles.push(createHorizontalHandle(
          displayX + displayWidth / 2,
          currentY + 3,
          Math.min(frontWidth / 2 - 2, 12)
        ));
        break;
    }

    currentSegmentY += rawSegmentHeightPx;
  }
}
