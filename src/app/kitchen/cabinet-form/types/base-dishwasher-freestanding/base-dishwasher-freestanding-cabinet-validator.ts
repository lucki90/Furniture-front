import { FormGroup, Validators } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';

export class BaseDishwasherFreestandingCabinetValidator implements KitchenCabinetValidator {

  private readonly constraints = KitchenCabinetConstraints.BASE_DISHWASHER_FREESTANDING;

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

    form.get('width')?.updateValueAndValidity();
    form.get('height')?.updateValueAndValidity();
    form.get('depth')?.updateValueAndValidity();
    form.updateValueAndValidity();
  }
}
