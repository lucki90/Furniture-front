import { KitchenCabinetRequestMapper } from "../../type-config/request-mapper/kitchen-cabinet-request-mapper";
import { CornerMechanismType, mapCornerFormToRequest } from "../../model/corner-cabinet.model";

/**
 * Request mapper dla szafki narożnej (CORNER_CABINET).
 * Mapuje dane formularza na request API, włącznie z konfiguracją narożnika.
 */
export class CornerCabinetRequestMapper implements KitchenCabinetRequestMapper {

  map(form: any): any {
    const isUpper = form.isUpperCorner ?? false;
    const mechanism = form.cornerMechanism ?? CornerMechanismType.FIXED_SHELVES;

    // Przygotuj cornerRequest
    const cornerRequest = {
      widthA: form.cornerWidthA,
      widthB: form.cornerWidthB,
      mechanism: mechanism,
      shelfQuantity: mechanism === CornerMechanismType.FIXED_SHELVES
        ? (form.cornerShelfQuantity ?? 2)
        : null,
      upperCabinet: isUpper
    };

    return {
      lang: 'pl',
      kitchenCabinetType: 'CORNER_CABINET',

      // Dla kompatybilności - width = widthA
      width: form.cornerWidthA,
      height: form.height,
      depth: form.depth,

      // Półki globalne - zależą od mechanizmu
      shelfQuantity: mechanism === CornerMechanismType.FIXED_SHELVES
        ? (form.cornerShelfQuantity ?? 2)
        : 0,

      needBacks: true,
      isHanging: isUpper,
      isHangingOnRail: isUpper,
      isStandingOnFeet: !isUpper,
      isBackInGroove: false,
      isFrontExtended: false,
      isCoveredWithCounterTop: !isUpper,  // Dolna ma blat, górna nie
      varnishedFront: false,

      // Szafka narożna ma zawsze dwa fronty (drzwi)
      frontType: 'TWO_DOORS',
      cabinetType: 'CORNER',
      openingType: form.openingType ?? 'HANDLE',

      // Brak szuflad w szafce narożnej
      drawerRequest: null,

      // Brak segmentów - narożnik nie jest segmentowy
      segments: null,

      // Konfiguracja narożnika
      cornerRequest: cornerRequest,

      materialRequest: {
        boxMaterial: 'CHIPBOARD',
        boxBoardThickness: 18,
        boxColor: 'WHITE',
        frontMaterial: 'CHIPBOARD',
        frontBoardThickness: 18,
        frontColor: 'WHITE',
        frontVeneerColor: 'WHITE',
        boxVeneerColor: 'WHITE'
      }
    };
  }
}
