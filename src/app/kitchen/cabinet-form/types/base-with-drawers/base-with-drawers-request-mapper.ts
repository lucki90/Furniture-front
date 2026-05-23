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

      drawerLayoutType: form.drawerLayoutType ?? 'EQUAL',
      drawerRequest: {
        drawerQuantity: form.drawerQuantity ?? 3,
        drawerModel: form.drawerModel ?? 'ANTARO_TANDEMBOX',
        drawerBaseHdf: false,
        // CUSTOM: wysokości od użytkownika → DrawerFrontDetail[]; EQUAL/MIXED_LOW_TOP → null (strategy sama liczy)
        drawerFrontDetails: this.buildDrawerFrontDetails(form)
      },
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }

  private buildDrawerFrontDetails(form: any): Array<{ height: number }> | null {
    if (form.drawerLayoutType !== 'CUSTOM') return null;
    const heights: Array<number | undefined> = form.drawerCustomHeightsMm ?? [];
    if (!Array.isArray(heights) || heights.length === 0) return null;
    return heights
      .filter((h): h is number => typeof h === 'number' && h > 0)
      .map(h => ({ height: h }));
  }
}
