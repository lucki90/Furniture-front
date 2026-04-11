import { FormGroup } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';
import { setDimensionValidators } from '../../type-config/validator/dimension-validator.utils';

/**
 * Validator dla szafki wiszącej z jednymi drzwiami (UPPER_ONE_DOOR).
 */
export class UpperOneDoorCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    setDimensionValidators(form, KitchenCabinetConstraints.UPPER_ONE_DOOR);
  }
}
