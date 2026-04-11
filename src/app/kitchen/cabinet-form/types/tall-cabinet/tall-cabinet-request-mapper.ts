import { FormArray, FormGroup } from "@angular/forms";
import { MaterialDefaults } from "../../type-config/request-mapper/kitchen-cabinet-request-mapper";
import { AbstractCabinetRequestMapper } from "../../type-config/request-mapper/abstract-cabinet-request-mapper";
import { mapSegmentToRequest, SegmentFormData, SegmentRequest } from "../../model/segment.model";

/**
 * Request mapper dla szafki typu słupek (TALL_CABINET).
 * Mapuje dane formularza na request API, włącznie z segmentami.
 */
export class TallCabinetRequestMapper extends AbstractCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    // Mapuj segmenty z FormArray
    const segments = this.mapSegments(form.segments);

    return {
      lang: 'pl',
      kitchenCabinetType: 'TALL_CABINET',
      width: form.width,
      height: form.height,
      depth: form.depth,

      // Słupek nie ma globalnych półek ani szuflad - są w segmentach
      shelfQuantity: 0,

      needBacks: true,
      isHanging: false,
      isHangingOnRail: false,
      isStandingOnFeet: true,  // Słupek stoi na nóżkach
      isBackInGroove: false,
      isFrontExtended: false,
      isCoveredWithCounterTop: false,  // Słupek nie ma blatu
      varnishedFront: materialDefaults.varnishedFront,

      // Dla szafki segmentowej frontType jest null - fronty są per segment
      frontType: null,
      cabinetType: 'STANDARD',
      openingType: form.openingType ?? 'HANDLE',

      // Brak globalnego drawerRequest - szuflady są w segmentach
      drawerRequest: null,

      // Segmenty
      segments: segments,
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }

  /**
   * Mapuje segmenty z formularza na format API.
   */
  private mapSegments(segmentsFormValue: any): SegmentRequest[] {
    if (!segmentsFormValue || !Array.isArray(segmentsFormValue)) {
      return [];
    }

    return segmentsFormValue.map((segment: SegmentFormData, index: number) => {
      // Ustaw orderIndex na podstawie pozycji w tablicy
      const segmentWithIndex: SegmentFormData = {
        ...segment,
        orderIndex: index
      };
      return mapSegmentToRequest(segmentWithIndex);
    });
  }
}
