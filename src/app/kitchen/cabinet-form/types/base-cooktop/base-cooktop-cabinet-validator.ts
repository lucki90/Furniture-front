import { FormGroup } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';

export class BaseCooktopCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    const c = KitchenCabinetConstraints.BASE_COOKTOP;

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
  }
}
