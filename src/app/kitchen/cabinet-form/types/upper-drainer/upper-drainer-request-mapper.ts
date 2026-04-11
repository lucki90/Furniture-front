import { MaterialDefaults } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { AbstractCabinetRequestMapper } from "../../type-config/request-mapper/abstract-cabinet-request-mapper";

/**
 * Request mapper dla szafki wiszącej z ociekaczem (UPPER_DRAINER).
 * Mapuje dane formularza na CabinetRequest wysyłany do backendu.
 */
export class UpperDrainerRequestMapper extends AbstractCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    return {
      lang: 'pl',
      kitchenCabinetType: 'UPPER_DRAINER',
      width: form.width,
      height: form.height,
      depth: form.depth,

      shelfQuantity: 0,  // Brak półek — system ociekacza zastępuje półki

      needBacks: true,
      isHanging: true,
      isHangingOnRail: true,
      isStandingOnFeet: false,
      isBackInGroove: false,
      isFrontExtended: false,
      isCoveredWithCounterTop: false,
      varnishedFront: materialDefaults.varnishedFront,

      cabinetType: 'STANDARD',
      openingType: form.openingType ?? 'HANDLE',

      // Typ frontu ociekacza
      drainerFrontType: form.drainerFrontType ?? 'OPEN',

      drawerRequest: null,
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }
}
