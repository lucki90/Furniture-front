import { MaterialDefaults } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { AbstractCabinetRequestMapper } from "../../type-config/request-mapper/abstract-cabinet-request-mapper";
import { mapSegmentToRequest, SegmentFormData, SegmentRequest, SegmentType } from '../../model/segment.model';

/**
 * Request mapper dla szafki na wbudowaną lodówkę (BASE_FRIDGE).
 * Strefa FULL — brak cokołu/blatu.
 *
 * Jeśli są sekcje górne (segmenty nad lodówką), mapper wysyła TYLKO sekcje górne (DOOR/OPEN_SHELF).
 * Segment FRIDGE_BUILT_IN jest dodawany automatycznie przez backend (BaseFridgeKitchenCabinetPreparer),
 * który oblicza jego wysokość na podstawie całkowitej wysokości szafki minus suma sekcji górnych.
 */
export class BaseFridgeRequestMapper extends AbstractCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    const sectionType: string = form.fridgeSectionType ?? 'TWO_DOORS';
    const shelfQuantity: number = form.shelfQuantity ?? 0;

    // Sekcje górne (opcjonalne — użytkownik dodaje w formularzu)
    // Filtrujemy FRIDGE_BUILT_IN — dodawany przez backend, nie przez frontend
    const upperSectionsFormData: SegmentFormData[] = Array.isArray(form.segments)
      ? form.segments.filter((s: SegmentFormData) => s.segmentType !== SegmentType.FRIDGE_BUILT_IN)
      : [];
    const hasUpperSections = upperSectionsFormData.length > 0;

    let segments: SegmentRequest[] | null = null;

    if (hasUpperSections) {
      // Mapuj sekcje górne (DOOR, OPEN_SHELF itp.)
      // Backend (BaseFridgeKitchenCabinetPreparer) automatycznie dołącza FRIDGE_BUILT_IN na końcu
      segments = upperSectionsFormData.map((seg: SegmentFormData, i: number) =>
        mapSegmentToRequest({ ...seg, orderIndex: i })
      );
    }

    return {
      lang: 'pl',
      kitchenCabinetType: 'BASE_FRIDGE',
      width: form.width,
      height: form.height,
      depth: form.depth,

      shelfQuantity,

      needBacks: shelfQuantity > 0,   // HDF tył tylko gdy są półki
      isHanging: false,
      isHangingOnRail: false,
      isStandingOnFeet: false,        // preparer ustawia standingOnFeet=false (jak TALL_CABINET)
      isBackInGroove: shelfQuantity > 0,
      isFrontExtended: false,
      isCoveredWithCounterTop: false,
      varnishedFront: materialDefaults.varnishedFront,

      cabinetType: 'FRIDGE',
      openingType: form.openingType ?? 'HANDLE',

      // Pola specyficzne dla lodówki
      fridgeSectionType: sectionType,
      lowerFrontHeightMm: sectionType === 'TWO_DOORS' ? (form.lowerFrontHeightMm ?? 713) : 0,

      drawerRequest: null,

      // Sekcje górne (null gdy brak)
      segments: segments,
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }
}
