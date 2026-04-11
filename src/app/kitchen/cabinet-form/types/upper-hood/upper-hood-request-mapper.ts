import { MaterialDefaults } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { AbstractCabinetRequestMapper } from "../../type-config/request-mapper/abstract-cabinet-request-mapper";

/**
 * Request mapper dla szafki wiszącej na okap (UPPER_HOOD).
 * Mapuje dane formularza na CabinetRequest wysyłany do backendu.
 */
export class UpperHoodRequestMapper extends AbstractCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    const hoodScreenEnabled: boolean = form.hoodScreenEnabled ?? false;

    return {
      lang: 'pl',
      kitchenCabinetType: 'UPPER_HOOD',
      width: form.width,
      height: form.height,
      depth: form.depth,

      shelfQuantity: 0,  // Brak półek — wnętrze zajęte przez okap

      needBacks: true,
      isHanging: true,
      isHangingOnRail: true,
      isStandingOnFeet: false,
      isBackInGroove: false,
      isFrontExtended: form.isFrontExtended ?? false,
      isCoveredWithCounterTop: false,
      varnishedFront: materialDefaults.varnishedFront,

      cabinetType: 'STANDARD',
      openingType: form.openingType ?? 'HANDLE',

      // Pola specyficzne dla szafki na okap
      hoodFrontType: form.hoodFrontType ?? 'FLAP',
      hoodScreenEnabled: hoodScreenEnabled,
      hoodScreenHeightMm: hoodScreenEnabled ? (form.hoodScreenHeightMm ?? 100) : 0,

      drawerRequest: null,
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }
}
