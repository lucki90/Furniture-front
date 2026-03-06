import { KitchenCabinetRequestMapper } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';

export class BaseSinkRequestMapper implements KitchenCabinetRequestMapper {

  map(form: any): any {
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
      varnishedFront: false,

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
        boxMaterial: 'CHIPBOARD',
        boxBoardThickness: 18,
        boxColor: 'WHITE',
        frontMaterial: 'CHIPBOARD',
        frontBoardThickness: 18,
        frontColor: 'WHITE',
        frontVeneerColor: 'WHITE',
        boxVeneerColor: 'WHITE'
      }
    };
  }
}
