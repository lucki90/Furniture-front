import { MaterialDefaults } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { AbstractCabinetRequestMapper } from "../../type-config/request-mapper/abstract-cabinet-request-mapper";

/**
 * Request mapper dla szafki wiszącej z jednymi drzwiami (UPPER_ONE_DOOR).
 */
export class UpperOneDoorRequestMapper extends AbstractCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    return {
      lang: 'pl',
      kitchenCabinetType: 'UPPER_ONE_DOOR',
      width: form.width,
      height: form.height,
      depth: form.depth,

      shelfQuantity: form.shelfQuantity ?? 1,

      needBacks: true,
      isHanging: true,
      isHangingOnRail: true,
      isStandingOnFeet: false,
      isBackInGroove: false,
      isFrontExtended: form.isFrontExtended ?? false,
      isCoveredWithCounterTop: false,
      varnishedFront: materialDefaults.varnishedFront,

      isLiftUp: form.isLiftUp ?? false,
      frontType: (form.isLiftUp ?? false) ? 'UPWARDS' : 'ONE_DOOR',
      cabinetType: 'STANDARD',
      openingType: form.openingType ?? 'HANDLE',

      drawerRequest: null,
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }
}
