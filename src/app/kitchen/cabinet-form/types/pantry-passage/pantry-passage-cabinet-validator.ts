import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import {
  CabinetFormValidationErrorCode,
  cabinetFormValidationError,
} from '../../cabinet-form-validation-error';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';

export class PantryPassageCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    const constraints = KitchenCabinetConstraints.PANTRY_PASSAGE;
    form.get('width')?.setValidators([
      Validators.required,
      Validators.min(constraints.WIDTH_MIN),
      Validators.max(constraints.WIDTH_MAX),
      this.createFrontTypeWidthValidator(form)
    ]);
    form.get('height')?.setValidators([
      Validators.required,
      Validators.min(constraints.HEIGHT_MIN),
      Validators.max(constraints.HEIGHT_MAX)
    ]);
    form.get('depth')?.setValidators([
      Validators.required,
      Validators.min(constraints.DEPTH_MIN),
      Validators.max(constraints.DEPTH_MAX)
    ]);
    form.get('shelfQuantity')?.setValidators([
      Validators.required,
      Validators.min(constraints.SHELF_MIN ?? 0),
      Validators.max(constraints.SHELF_MAX ?? 0)
    ]);
    form.get('width')?.updateValueAndValidity({ emitEvent: false });
    form.get('height')?.updateValueAndValidity({ emitEvent: false });
    form.get('depth')?.updateValueAndValidity({ emitEvent: false });
    form.get('shelfQuantity')?.updateValueAndValidity({ emitEvent: false });
    form.updateValueAndValidity({ emitEvent: false });
  }

  private createFrontTypeWidthValidator(form: FormGroup): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const width = Number(control.value);
      const frontType = form.get('pantryPassageFrontType')?.value ?? 'TWO_DOORS';
      if (!Number.isFinite(width)) {
        return null;
      }
      if (frontType === 'ONE_DOOR' && width > 600) {
        return cabinetFormValidationError(CabinetFormValidationErrorCode.PANTRY_ONE_DOOR_TOO_WIDE);
      }
      return null;
    };
  }
}
