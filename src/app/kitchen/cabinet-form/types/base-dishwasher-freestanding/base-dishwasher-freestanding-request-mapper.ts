import { MaterialDefaults } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { AbstractCabinetRequestMapper } from "../../type-config/request-mapper/abstract-cabinet-request-mapper";

export class BaseDishwasherFreestandingRequestMapper extends AbstractCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    return {
      lang: 'pl',
      kitchenCabinetType: 'BASE_DISHWASHER_FREESTANDING',
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
      isCoveredWithCounterTop: true,
      varnishedFront: materialDefaults.varnishedFront,

      openingType: 'NONE',
      drawerRequest: null,
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }
}
