import { KitchenCabinetRequestMapper, MaterialDefaults } from './kitchen-cabinet-request-mapper';
import { MaterialRequest } from '../../model/kitchen-cabinet-form.model';

// TODO R.9: Factory function for simple mappers — base-one-door, base-two-door, upper-one-door,
// upper-two-door differ by at most 2 field values. A `createSimpleMapper(defaults)` factory
// would collapse ~4 near-identical concrete classes into one.
export abstract class AbstractCabinetRequestMapper implements KitchenCabinetRequestMapper {

  abstract map(formValue: any, materialDefaults: MaterialDefaults): any;

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
