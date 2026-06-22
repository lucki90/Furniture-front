import { AbstractControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';
import { integerValidator } from '../../type-config/validator/integer.validator';

export class BaseCooktopCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    const c = KitchenCabinetConstraints.BASE_COOKTOP;

    form.get('width')?.setValidators([
      Validators.required,
      Validators.min(c.WIDTH_MIN),
      Validators.max(c.WIDTH_MAX)
    ]);
    form.get('height')?.setValidators([
      Validators.required,
      Validators.min(c.HEIGHT_MIN),
      Validators.max(c.HEIGHT_MAX)
    ]);
    form.get('depth')?.setValidators([
      Validators.required,
      Validators.min(c.DEPTH_MIN),
      Validators.max(c.DEPTH_MAX)
    ]);

    form.get('drawerQuantity')?.setValidators([
      this.drawerQuantityValidator(form)
    ]);

    form.get('width')?.updateValueAndValidity();
    form.get('height')?.updateValueAndValidity();
    form.get('depth')?.updateValueAndValidity();
    form.get('drawerQuantity')?.updateValueAndValidity();
    form.updateValueAndValidity();
  }

  private drawerQuantityValidator(form: FormGroup) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (form.get('cooktopFrontType')?.value !== 'DRAWERS') {
        return null;
      }

      return Validators.compose([
        Validators.required,
        Validators.min(KitchenCabinetConstraints.BASE_COOKTOP.DRAWER_MIN),
        Validators.max(KitchenCabinetConstraints.BASE_COOKTOP.DRAWER_MAX),
        integerValidator
      ])?.(control) ?? null;
    };
  }
}
