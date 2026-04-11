import { MaterialDefaults } from "../../type-config/request-mapper/kitchen-cabinet-request-mapper";
import { AbstractCabinetRequestMapper } from "../../type-config/request-mapper/abstract-cabinet-request-mapper";

export class BaseOneDoorRequestMapper
  extends AbstractCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    return {
      lang: 'pl',
      kitchenCabinetType: 'BASE_ONE_DOOR',
      width: form.width,
      height: form.height,
      depth: form.depth,

      shelfQuantity: form.shelfQuantity ?? 1,

      needBacks: true,
      isHanging: false,
      isHangingOnRail: false,
      isStandingOnFeet: false,
      isBackInGroove: false,
      isFrontExtended: false,
      isCoveredWithCounterTop: false,
      varnishedFront: materialDefaults.varnishedFront,

      frontType: 'ONE_DOOR',
      cabinetType: 'STANDARD',
      openingType: form.openingType ?? 'HANDLE',

      drawerRequest: null,
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }
}
