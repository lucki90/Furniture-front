import { FormGroup } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';
import { setDimensionValidators } from '../../type-config/validator/dimension-validator.utils';

/**
 * Validator dla szafki wiszącej z dwojgiem drzwi (UPPER_TWO_DOOR).
 */
export class UpperTwoDoorCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    setDimensionValidators(form, KitchenCabinetConstraints.UPPER_TWO_DOOR);
  }
}
