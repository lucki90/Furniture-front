import { AbstractCabinetRequestMapper } from '../../type-config/request-mapper/abstract-cabinet-request-mapper';
import { MaterialDefaults } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';

export class BaseCargoRequestMapper extends AbstractCabinetRequestMapper {
  map(form: any, materialDefaults: MaterialDefaults): any {
    const isDrawersVariant = form.cargoVariant === 'DRAWERS';
    const drawerQuantity = form.drawerQuantity ?? 3;

    return {
      lang: 'pl',
      kitchenCabinetType: 'BASE_CARGO',
      width: form.width,
      height: form.height,
      depth: form.depth,

      shelfQuantity: 0,

      needBacks: true,
      isHanging: false,
      isHangingOnRail: false,
      isStandingOnFeet: false,
      isBackInGroove: false,
      isFrontExtended: false,
      isCoveredWithCounterTop: true,
      varnishedFront: materialDefaults.varnishedFront,

      frontType: 'ONE_DOOR',
      cabinetType: 'CARGO',
      openingType: form.openingType ?? 'HANDLE',
      cargoVariant: form.cargoVariant ?? 'MECHANISM',
      cargoBrand: form.cargoBrand ?? 'BLUM',

      drawerRequest: {
        drawerQuantity,
        drawerModel: isDrawersVariant ? (form.drawerModel ?? 'ANTARO_TANDEMBOX') : null,
        drawerBaseHdf: false,
        drawerFrontDetails: null
      },
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }
}
