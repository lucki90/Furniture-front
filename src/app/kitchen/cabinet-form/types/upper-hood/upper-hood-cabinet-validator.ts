import { AbstractControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';
import { setDimensionValidators } from '../../type-config/validator/dimension-validator.utils';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';

/** Stała referencja zachowuje walidatory inputu przy kolejnych odtworzeniach szafki. */
function hoodScreenHeightValidator(control: AbstractControl): ValidationErrors | null {
  const form = control.parent;
  if (form?.get('kitchenCabinetType')?.value !== KitchenCabinetType.UPPER_HOOD
      || !form.get('hoodScreenEnabled')?.value) return null;
  const c = KitchenCabinetConstraints.UPPER_HOOD;
  return Validators.compose([Validators.required, Validators.min(c.HOOD_SCREEN_MIN),
    Validators.max(c.HOOD_SCREEN_MAX)])?.(control) ? { outOfRange: true } : null;
}

export class UpperHoodCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    const c = KitchenCabinetConstraints.UPPER_HOOD;

    setDimensionValidators(form, c);
    form.get('shelfQuantity')?.clearValidators();
    form.get('shelfQuantity')?.updateValueAndValidity({ emitEvent: false });

    const screenHeightCtrl = form.get('hoodScreenHeightMm');
    screenHeightCtrl?.addValidators(hoodScreenHeightValidator);
    screenHeightCtrl?.updateValueAndValidity({ emitEvent: false });
  }
}
