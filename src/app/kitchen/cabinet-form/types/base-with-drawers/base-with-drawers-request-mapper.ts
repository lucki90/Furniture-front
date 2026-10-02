import { CabinetCalculateRequest, MaterialDefaults } from "../../type-config/request-mapper/kitchen-cabinet-request-mapper";
import { AbstractCabinetRequestMapper } from "../../type-config/request-mapper/abstract-cabinet-request-mapper";
import { buildCustomDrawerFrontDetails } from "./drawer-front-details";

export class BaseWithDrawersRequestMapper extends AbstractCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): CabinetCalculateRequest {
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
      frontMountingType: form.frontMountingType ?? 'OVERLAY',
      bottomWreathOnFloor: form.bottomWreathOnFloor ?? false,
      openingType: form.openingType ?? 'HANDLE',

      drawerLayoutType: form.drawerLayoutType ?? 'EQUAL',
      drawerRequest: {
        drawerQuantity: form.drawerQuantity ?? 3,
        drawerModel: form.drawerModel ?? 'ANTARO_TANDEMBOX',
        drawerBaseHdf: false,
        // CUSTOM: wysokości od użytkownika → DrawerFrontDetail[]; EQUAL/MIXED_LOW_TOP → null (strategy sama liczy)
        drawerFrontDetails: buildCustomDrawerFrontDetails(form.drawerLayoutType, form.drawerCustomHeightsMm)
      },
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }
}
