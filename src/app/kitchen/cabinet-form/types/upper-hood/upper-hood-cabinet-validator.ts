import { AbstractControl, FormGroup, ValidationErrors } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';

/**
 * Zakres wysokości blendy wewnętrznej — aktywny tylko dla UPPER_HOOD z włączoną blendą.
 * Stała referencja pozwala dodać walidator bez nadpisywania walidatorów min/max inputu.
 */
function hoodScreenHeightValidator(control: AbstractControl): ValidationErrors | null {
  const form = control.parent;
  if (form?.get('kitchenCabinetType')?.value !== KitchenCabinetType.UPPER_HOOD
    || !form.get('hoodScreenEnabled')?.value) return null;
  const c = KitchenCabinetConstraints.UPPER_HOOD;
  const sh = control.value;
  return sh < c.HOOD_SCREEN_MIN || sh > c.HOOD_SCREEN_MAX ? { outOfRange: true } : null;
}

export class UpperHoodCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    const c = KitchenCabinetConstraints.UPPER_HOOD;

    const widthCtrl = form.get('width');
    if (widthCtrl) {
      const w = widthCtrl.value;
      if (w < c.WIDTH_MIN || w > c.WIDTH_MAX) {
        widthCtrl.setErrors({ outOfRange: true });
      } else {
        widthCtrl.setErrors(null);
      }
    }

    const heightCtrl = form.get('height');
    if (heightCtrl) {
      const h = heightCtrl.value;
      if (h < c.HEIGHT_MIN || h > c.HEIGHT_MAX) {
        heightCtrl.setErrors({ outOfRange: true });
      } else {
        heightCtrl.setErrors(null);
      }
    }

    const depthCtrl = form.get('depth');
    if (depthCtrl) {
      const d = depthCtrl.value;
      if (d < c.DEPTH_MIN || d > c.DEPTH_MAX) {
        depthCtrl.setErrors({ outOfRange: true });
      } else {
        depthCtrl.setErrors(null);
      }
    }

    // Walidacja wysokości blendy wewnętrznej (gdy włączona) — trwały walidator, bo pole jest włączane
    // dopiero po odtworzeniu zapisanej szafki lub kliknięciu checkboxa, a enable() ponownie je waliduje.
    const screenHeightCtrl = form.get('hoodScreenHeightMm');
    screenHeightCtrl?.addValidators(hoodScreenHeightValidator);
    screenHeightCtrl?.updateValueAndValidity({ emitEvent: false });
  }
}
