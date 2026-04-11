import { MaterialDefaults } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { AbstractCabinetRequestMapper } from "../../type-config/request-mapper/abstract-cabinet-request-mapper";

/**
 * Request mapper dla wolnostojącego piekarnika (BASE_OVEN_FREESTANDING).
 * Wizualizacja — 0 płyt.
 */
export class BaseOvenFreestandingRequestMapper extends AbstractCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    return {
      lang: 'pl',
      kitchenCabinetType: 'BASE_OVEN_FREESTANDING',
      width: form.width,
      height: form.height,
      depth: form.depth,

      shelfQuantity: 0,

      needBacks: false,
      isHanging: false,
      isHangingOnRail: false,
      isStandingOnFeet: false,
      isBackInGroove: false,
      isFrontExtended: false,
      isCoveredWithCounterTop: false,
      varnishedFront: materialDefaults.varnishedFront,

      cabinetType: 'DISHWASHER',
      openingType: form.openingType ?? 'NONE',

      drawerRequest: null,
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }
}
