import { FormGroup, Validators } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';
import { setDimensionValidators } from '../../type-config/validator/dimension-validator.utils';

export class UpperHoodCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    const c = KitchenCabinetConstraints.UPPER_HOOD;

    setDimensionValidators(form, c);
    form.get('shelfQuantity')?.clearValidators();
    form.get('shelfQuantity')?.updateValueAndValidity({ emitEvent: false });

    const screenHeightCtrl = form.get('hoodScreenHeightMm');
    screenHeightCtrl?.setValidators(control => {
      if (form.get('kitchenCabinetType')?.value !== 'UPPER_HOOD'
          || !form.get('hoodScreenEnabled')?.value) return null;
      return Validators.compose([Validators.required, Validators.min(c.HOOD_SCREEN_MIN),
        Validators.max(c.HOOD_SCREEN_MAX)])?.(control) ? { outOfRange: true } : null;
    });
    screenHeightCtrl?.updateValueAndValidity({ emitEvent: false });
  }
}
