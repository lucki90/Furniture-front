import { KitchenCabinetRequestMapper, MaterialDefaults } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';

export class BaseCooktopRequestMapper implements KitchenCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    const cooktopFrontType: string = form.cooktopFrontType ?? 'DRAWERS';
    const isDrawers = cooktopFrontType === 'DRAWERS';

    return {
      lang: 'pl',
      kitchenCabinetType: 'BASE_COOKTOP',
      width: form.width,
      height: form.height,
      depth: form.depth,

      shelfQuantity: isDrawers ? 0 : (form.shelfQuantity ?? 1),

      needBacks: true,
      isHanging: false,
      isHangingOnRail: false,
      isStandingOnFeet: true,
      isBackInGroove: false,
      isFrontExtended: false,
      isCoveredWithCounterTop: false,
      varnishedFront: materialDefaults.varnishedFront,

      openingType: form.openingType ?? 'HANDLE',

      // Pola specyficzne dla szafki pod płytę grzewczą
      cooktopType: form.cooktopType ?? 'INDUCTION',
      cooktopFrontType: cooktopFrontType,

      // Szuflady — tylko gdy frontType=DRAWERS
      drawerRequest: isDrawers ? {
        drawerQuantity: form.drawerQuantity ?? 3,
        drawerModel: form.drawerModel ?? 'ANTARO_TANDEMBOX',
        drawerBaseHdf: false,
        drawerFrontDetails: null
      } : null,

      materialRequest: {
        boxMaterial: materialDefaults.boxMaterial,
        boxBoardThickness: materialDefaults.boxBoardThickness,
        boxColor: materialDefaults.boxColor,
        frontMaterial: materialDefaults.frontMaterial,
        frontBoardThickness: materialDefaults.frontBoardThickness,
        frontColor: materialDefaults.frontColor,
        frontVeneerColor: materialDefaults.frontColor,
        boxVeneerColor: materialDefaults.boxColor
      }
    };
  }
}
