import { FormGroup, ValidatorFn, Validators } from "@angular/forms";
import { KitchenCabinetValidator } from "../../type-config/validator/kitchen-cabinet-validator";
import { KitchenCabinetConstraints } from "../../model/kitchen-cabinet-constants";
import { integerValidator } from '../../type-config/validator/integer.validator';

export class BaseWithDrawersCabinetValidator implements KitchenCabinetValidator {

  private readonly constraints = KitchenCabinetConstraints.BASE_WITH_DRAWERS;

  private readonly customHeightsValidator: ValidatorFn = control => {
    const form = control as FormGroup;
    if (form.get('kitchenCabinetType')?.value !== 'BASE_WITH_DRAWERS'
        || form.get('drawerLayoutType')?.value !== 'CUSTOM') return null;
    const heights = form.get('drawerCustomHeightsMm')?.value as unknown[] | undefined;
    return !heights || heights.length !== form.get('drawerQuantity')?.value
      || heights.some(height => typeof height !== 'number' || !Number.isInteger(height) || height < 60 || height > 700)
      ? { customDrawerHeights: true } : null;
  };

  validate(form: FormGroup): void {
    form.addValidators(this.customHeightsValidator);
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

    form.get('drawerQuantity')?.setValidators([
      Validators.required,
      Validators.min(this.constraints.DRAWER_MIN),
      Validators.max(this.constraints.DRAWER_MAX),
      integerValidator
    ]);

    form.get('width')?.updateValueAndValidity();
    form.get('height')?.updateValueAndValidity();
    form.get('depth')?.updateValueAndValidity();
    form.get('drawerQuantity')?.updateValueAndValidity();
    form.updateValueAndValidity();
  }
}
