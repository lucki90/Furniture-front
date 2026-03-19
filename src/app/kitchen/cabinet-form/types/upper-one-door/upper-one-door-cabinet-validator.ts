import { FormGroup, Validators } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';

/**
 * Validator dla szafki wiszącej z jednymi drzwiami (UPPER_ONE_DOOR).
 */
export class UpperOneDoorCabinetValidator implements KitchenCabinetValidator {

  private readonly constraints = KitchenCabinetConstraints.UPPER_ONE_DOOR;

  validate(form: FormGroup): void {
    form.get('width')?.setValidators([
      Validators.required,
      Validators.min(this.constraints.WIDTH_MIN),
      Validators.max(this.constraints.WIDTH_MAX)
    ]);

    form.get('height')?.setValidators([
      Validators.required,
      Validators.min(this.constraints.HEIGHT_MIN),
      Validators.max(this.constraints.HEIGHT_MAX)
    ]);

    form.get('depth')?.setValidators([
      Validators.required,
      Validators.min(this.constraints.DEPTH_MIN),
      Validators.max(this.constraints.DEPTH_MAX)
    ]);

    form.get('shelfQuantity')?.setValidators([
      Validators.required,
      Validators.min(this.constraints.SHELF_MIN),
      Validators.max(this.constraints.SHELF_MAX)
    ]);

    form.get('width')?.updateValueAndValidity();
    form.get('height')?.updateValueAndValidity();
    form.get('depth')?.updateValueAndValidity();
    form.get('shelfQuantity')?.updateValueAndValidity();
    form.updateValueAndValidity();
  }
}
