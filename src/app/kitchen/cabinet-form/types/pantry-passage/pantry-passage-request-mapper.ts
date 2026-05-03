import { MaterialDefaults } from '../../type-config/request-mapper/kitchen-cabinet-request-mapper';
import { AbstractCabinetRequestMapper } from '../../type-config/request-mapper/abstract-cabinet-request-mapper';

export class PantryPassageRequestMapper extends AbstractCabinetRequestMapper {

  map(form: any, materialDefaults: MaterialDefaults): any {
    // attachedPlinthHeightMm / attachedPlinthSetbackMm are injected later by CabinetFormCalculationService,
    // because they depend on the active wall/project plinth state rather than static form fields.
    return {
      lang: 'pl',
      kitchenCabinetType: 'PANTRY_PASSAGE',
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
      isCoveredWithCounterTop: false,
      varnishedFront: materialDefaults.varnishedFront,

      frontType: form.pantryPassageFrontType ?? 'TWO_DOORS',
      cabinetType: 'PANTRY_PASSAGE',
      openingType: form.openingType ?? 'HANDLE',

      drawerRequest: null,
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }
}
