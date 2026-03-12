import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';

function allowedValuesValidator(allowed: readonly number[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = Number(control.value);
    return allowed.includes(value) ? null : { allowedValues: { allowed, actual: value } };
  };
}

export class BaseDishwasherCabinetValidator implements KitchenCabinetValidator {

  private readonly constraints = KitchenCabinetConstraints.BASE_DISHWASHER;

  validate(form: FormGroup): void {
    form.get('width')?.setValidators([
      Validators.required,
      allowedValuesValidator(this.constraints.WIDTH_ALLOWED)
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
