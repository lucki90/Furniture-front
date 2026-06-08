import { FormGroup } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';
import { setDimensionValidators } from '../../type-config/validator/dimension-validator.utils';

/**
 * Validator dla osobnego typu szafki wiszacej z klapa do gory (UPPER_LIFT_UP).
 */
export class UpperLiftUpCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    setDimensionValidators(form, KitchenCabinetConstraints.UPPER_LIFT_UP);
  }
}
