import { KitchenCabinetRequestMapper, MaterialDefaults } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';

export class BaseSinkRequestMapper implements KitchenCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    const sinkFrontType: string = form.sinkFrontType ?? 'TWO_DOORS';
    const isDrawer = sinkFrontType === 'DRAWER';

    return {
      lang: 'pl',
      kitchenCabinetType: 'BASE_SINK',
      width: form.width,
      height: form.height,
      depth: form.depth,

      shelfQuantity: 0,  // brak półek — przestrzeń techniczna pod zlewem

      needBacks: true,
      isHanging: false,
      isHangingOnRail: false,
      isStandingOnFeet: false,
      isBackInGroove: false,
      isFrontExtended: false,
      isCoveredWithCounterTop: false,
      varnishedFront: materialDefaults.varnishedFront,

      openingType: form.openingType ?? 'HANDLE',

      // Pola specyficzne dla szafki zlewowej
      sinkFrontType: sinkFrontType,
      sinkApronEnabled: form.sinkApronEnabled ?? true,
      sinkApronHeightMm: form.sinkApronHeightMm ?? 150,

      // Szuflada — gdy frontType=DRAWER, przekazujemy drawer request
      drawerRequest: isDrawer ? {
        drawerQuantity: 1,
        drawerModel: form.sinkDrawerModel ?? 'ANTARO_TANDEMBOX',
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
