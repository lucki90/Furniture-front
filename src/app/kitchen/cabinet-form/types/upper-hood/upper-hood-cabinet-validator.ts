import { FormGroup } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';

export class UpperHoodCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    const c = KitchenCabinetConstraints.UPPER_HOOD;

    const widthCtrl = form.get('width');
    if (widthCtrl) {
      const w = widthCtrl.value;
      if (w < c.WIDTH_MIN || w > c.WIDTH_MAX || (w - c.WIDTH_MIN) % c.WIDTH_STEP !== 0) {
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

    // Walidacja wysokości blendy wewnętrznej (gdy włączona)
    const screenEnabledCtrl = form.get('hoodScreenEnabled');
    const screenHeightCtrl = form.get('hoodScreenHeightMm');
    if (screenEnabledCtrl?.value && screenHeightCtrl) {
      const sh = screenHeightCtrl.value;
      if (sh < c.HOOD_SCREEN_MIN || sh > c.HOOD_SCREEN_MAX) {
        screenHeightCtrl.setErrors({ outOfRange: true });
      } else {
        screenHeightCtrl.setErrors(null);
      }
    }
  }
}
