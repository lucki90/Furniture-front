import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { createVerticalHandle } from '../cabinet-svg-helpers';
import { SegmentType, SegmentFrontType } from '../../../cabinet-form/model/segment.model';
import { renderSingleDoor } from './single-door.renderer';
import { FRIDGE_LOWER_FRONT_DEFAULT_MM, FRIDGE_TOTAL_HEIGHT_DEFAULT_MM } from '../../kitchen-layout.constants';

/**
 * Renderuje lodówkę w zabudowie (BASE_FRIDGE).
 * Strefa FULL — od podłogi do sufitu.
 * Obsługuje:
 *  - ONE_DOOR: jedno duże drzwi
 *  - TWO_DOORS: dwie sekcje — górna (lodówka) + dolna (zamrażarka), proporcjonalnie do lowerFrontHeightMm
 * Opcjonalne sekcje górne (np. DOOR, OPEN_SHELF) renderowane od góry przed sekcją lodówki.
 */
export function renderFridgeBuiltIn(
  ctx: CabinetRenderContext,
  fronts: DisplayFront[],
  handles: DisplayHandle[]
): void {
  const { displayX, bodyY, displayWidth, bodyHeight, frontGap: gap, fridgeConfig } = ctx;
  const sectionType = fridgeConfig?.fridgeSectionType ?? 'TWO_DOORS';
  const upperSections = fridgeConfig?.upperSections ?? [];
  const totalHeightMm = fridgeConfig?.heightMm ?? FRIDGE_TOTAL_HEIGHT_DEFAULT_MM;

  // Oblicz wysokość sekcji górnych (px)
  const upperSectionsHeightMm = upperSections.reduce((sum, s) => sum + (s.height ?? 0), 0);
  const upperSectionsTotalPx = upperSections.length > 0
    ? Math.round((upperSectionsHeightMm / totalHeightMm) * bodyHeight)
    : 0;

  // Renderuj sekcje górne (od góry)
  if (upperSections.length > 0) {
    const sortedUpperSections = [...upperSections].sort((a, b) => a.orderIndex - b.orderIndex);
    let currentUpperY = bodyY + gap;

    for (const section of sortedUpperSections) {
      const sectionPx = Math.round((section.height / totalHeightMm) * bodyHeight) - gap;

      if (section.segmentType === SegmentType.OPEN_SHELF) {
        fronts.push({
          type: 'OPEN',
          x: displayX + gap,
          y: currentUpperY,
          width: displayWidth - gap * 2,
          height: Math.max(1, sectionPx)
        });
      } else {
        // DOOR (ONE_DOOR lub TWO_DOORS)
        if (section.frontType === SegmentFrontType.TWO_DOORS) {
          const doorWidth = (displayWidth - gap * 3) / 2;
          fronts.push(
            { type: 'DOOR_SINGLE', x: displayX + gap, y: currentUpperY, width: doorWidth, height: Math.max(1, sectionPx), hingesSide: 'LEFT' },
            { type: 'DOOR_SINGLE', x: displayX + gap + doorWidth + gap, y: currentUpperY, width: doorWidth, height: Math.max(1, sectionPx), hingesSide: 'RIGHT' }
          );
          handles.push(
            createVerticalHandle(displayX + gap + doorWidth - 3, currentUpperY + 3, sectionPx - 6),
            createVerticalHandle(displayX + gap + doorWidth + gap + 3, currentUpperY + 3, sectionPx - 6)
          );
        } else {
          fronts.push({ type: 'DOOR_SINGLE', x: displayX + gap, y: currentUpperY, width: displayWidth - gap * 2, height: Math.max(1, sectionPx), hingesSide: 'LEFT' });
          handles.push(createVerticalHandle(displayX + displayWidth - gap - 4, currentUpperY + 3, sectionPx - 6));
        }
      }

      currentUpperY += sectionPx + gap;
    }
  }

  // Sekcja lodówki — poniżej sekcji górnych
  const fridgeSectionY = bodyY + upperSectionsTotalPx;
  const fridgeSectionPx = bodyHeight - upperSectionsTotalPx;

  if (sectionType === 'ONE_DOOR') {
    renderSingleDoor(
      { ...ctx, bodyY: fridgeSectionY, bodyHeight: fridgeSectionPx },
      fronts, handles
    );
  } else {
    // TWO_DOORS: górny front (lodówka) + dolny front (zamrażarka)
    // Proporcja odwołuje się do SAMEJ sekcji lodówki (nie całej szafki)
    const fridgeHeightMm = totalHeightMm - upperSectionsHeightMm;
    const lowerH = fridgeConfig?.lowerFrontHeightMm ?? FRIDGE_LOWER_FRONT_DEFAULT_MM;
    const lowerRatio = Math.min(Math.max(lowerH / Math.max(fridgeHeightMm, 1), 0.1), 0.9);
    const lowerDisplayH = Math.round(fridgeSectionPx * lowerRatio);
    const upperDisplayH = fridgeSectionPx - lowerDisplayH;

    // Górny front (lodówka)
    fronts.push({
      type: 'DOOR_SINGLE',
      x: displayX + gap,
      y: fridgeSectionY + gap,
      width: displayWidth - gap * 2,
      height: Math.max(1, upperDisplayH - gap * 2),
      hingesSide: 'LEFT'
    });
    handles.push(createVerticalHandle(
      displayX + displayWidth - gap - 4,
      fridgeSectionY + gap + 3,
      upperDisplayH - gap * 2 - 6
    ));

    // Dolny front (zamrażarka)
    const lowerY = fridgeSectionY + upperDisplayH + gap;
    fronts.push({
      type: 'DOOR_SINGLE',
      x: displayX + gap,
      y: lowerY,
      width: displayWidth - gap * 2,
      height: Math.max(1, lowerDisplayH - gap * 2),
      hingesSide: 'LEFT'
    });
    handles.push(createVerticalHandle(
      displayX + displayWidth - gap - 4,
      lowerY + 3,
      lowerDisplayH - gap * 2 - 6
    ));
  }
}
