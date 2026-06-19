import {
  CabinetCalculateRequest,
  CabinetRequestFormValue,
  KitchenCabinetRequestMapper,
  MaterialDefaults
} from './kitchen-cabinet-request-mapper';
import { MaterialRequest } from '../../model/kitchen-cabinet-form.model';

export abstract class AbstractCabinetRequestMapper implements KitchenCabinetRequestMapper {

  abstract map(formValue: CabinetRequestFormValue, materialDefaults: MaterialDefaults): CabinetCalculateRequest;

  /** Builds the standard materialRequest block shared by ALL cabinet types. */
  protected buildMaterialRequest(md: MaterialDefaults): MaterialRequest {
    return {
      boxMaterial: md.boxMaterial,
      boxBoardThickness: md.boxBoardThickness,
      boxColor: md.boxColor,
      frontMaterial: md.frontMaterial,
      frontBoardThickness: md.frontBoardThickness,
      frontColor: md.frontColor,
      frontVeneerColor: md.frontColor,
      boxVeneerColor: md.boxColor,
    };
  }
}

export interface SimpleDoorRequestMapperOptions {
  kitchenCabinetType: 'BASE_ONE_DOOR' | 'BASE_TWO_DOOR' | 'UPPER_ONE_DOOR' | 'UPPER_TWO_DOOR';
  frontType: 'ONE_DOOR' | 'TWO_DOORS';
  level: 'BASE' | 'UPPER';
  allowLiftUp?: boolean;
}

class SimpleDoorRequestMapper extends AbstractCabinetRequestMapper {
  constructor(private readonly options: SimpleDoorRequestMapperOptions) {
    super();
  }

  map(form: CabinetRequestFormValue, materialDefaults: MaterialDefaults): CabinetCalculateRequest {
    const liftUp = this.options.allowLiftUp && (form.isLiftUp ?? false);

    return {
      lang: 'pl',
      kitchenCabinetType: this.options.kitchenCabinetType,
      width: form.width,
      height: form.height,
      depth: form.depth,
      shelfQuantity: form.shelfQuantity ?? 1,
      needBacks: true,
      isHanging: this.options.level === 'UPPER',
      isHangingOnRail: this.options.level === 'UPPER',
      isStandingOnFeet: false,
      isBackInGroove: false,
      isFrontExtended: this.options.level === 'UPPER' ? (form.isFrontExtended ?? false) : false,
      isCoveredWithCounterTop: false,
      varnishedFront: materialDefaults.varnishedFront,
      ...(this.options.allowLiftUp ? { isLiftUp: liftUp } : {}),
      frontType: liftUp ? 'UPWARDS' : this.options.frontType,
      cabinetType: 'STANDARD',
      openingType: form.openingType ?? 'HANDLE',
      drawerRequest: null,
      materialRequest: this.buildMaterialRequest(materialDefaults)
    };
  }
}

/** Tworzy mapper dla standardowej szafki drzwiowej bez powielania wspólnego requestu. */
export function createSimpleDoorRequestMapper(
  options: SimpleDoorRequestMapperOptions
): KitchenCabinetRequestMapper {
  return new SimpleDoorRequestMapper(options);
}
