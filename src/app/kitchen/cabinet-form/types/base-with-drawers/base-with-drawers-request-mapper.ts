import { MaterialDefaults } from "../../type-config/request-mapper/kitchen-cabinet-request-mapper";
import { AbstractCabinetRequestMapper } from "../../type-config/request-mapper/abstract-cabinet-request-mapper";

export class BaseWithDrawersRequestMapper extends AbstractCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    return {
      lang: 'pl',
      kitchenCabinetType: 'BASE_WITH_DRAWERS',
      width: form.width,
      height: form.height,
      depth: form.depth,

      shelfQuantity: 0, // szafka z szufladami nie ma półek

      needBacks: true,
      isHanging: false,
      isHangingOnRail: false,
      isStandingOnFeet: false,
      isBackInGroove: false,
      isFrontExtended: false,
      isCoveredWithCounterTop: false,
      varnishedFront: materialDefaults.varnishedFront,

      frontType: 'DRAWER',
      cabinetType: 'STANDARD',
      openingType: form.openingType ?? 'HANDLE',

      drawerRequest: {
        drawerQuantity: form.drawerQuantity ?? 3,
        drawerModel: form.drawerModel ?? 'ANTARO_TANDEMBOX',
        drawerBaseHdf: false,
        drawerFrontDetails: null // równe wysokości szuflad
      },
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }
}
