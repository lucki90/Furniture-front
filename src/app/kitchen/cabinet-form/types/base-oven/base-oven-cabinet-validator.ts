import { FormGroup } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';
import { OvenHeightType, OVEN_SLOT_HEIGHT } from './oven-cabinet.model';

export class BaseOvenCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    const c = KitchenCabinetConstraints.BASE_OVEN;

    // Width
    const widthCtrl = form.get('width');
    if (widthCtrl) {
      const w = widthCtrl.value;
      if (w < c.WIDTH_MIN || w > c.WIDTH_MAX) {
        widthCtrl.setErrors({ outOfRange: true });
      } else {
        widthCtrl.setErrors(null);
      }
    }

    // Height
    const heightCtrl = form.get('height');
    if (heightCtrl) {
      const h = heightCtrl.value;
      if (h < c.HEIGHT_MIN || h > c.HEIGHT_MAX) {
        heightCtrl.setErrors({ outOfRange: true });
      } else {
        heightCtrl.setErrors(null);
      }
    }

    // Depth
    const depthCtrl = form.get('depth');
    if (depthCtrl) {
      const d = depthCtrl.value;
      if (d < c.DEPTH_MIN || d > c.DEPTH_MAX) {
        depthCtrl.setErrors({ outOfRange: true });
      } else {
        depthCtrl.setErrors(null);
      }
    }

    // Apron height (when enabled)
    const apronEnabled: boolean = form.get('ovenApronEnabled')?.value ?? false;
    const apronCtrl = form.get('ovenApronHeightMm');
    if (apronEnabled && apronCtrl) {
      const a = apronCtrl.value;
      if (a < c.APRON_MIN || a > c.APRON_MAX) {
        apronCtrl.setErrors({ outOfRange: true });
      } else {
        apronCtrl.setErrors(null);
      }
    } else if (apronCtrl) {
      apronCtrl.setErrors(null);
    }

    // Lower section feasibility check
    if (!heightCtrl?.errors) {
      const T = 18;
      const h = form.get('height')?.value ?? 0;
      const ovenType: OvenHeightType = form.get('ovenHeightType')?.value ?? OvenHeightType.STANDARD;
      const ovenSlot = OVEN_SLOT_HEIGHT[ovenType] ?? 595;
      const apronH = apronEnabled ? (form.get('ovenApronHeightMm')?.value ?? 0) : 0;
      const lowerSection = h - (2 * T) - T - ovenSlot - apronH;
      if (lowerSection < c.LOWER_SECTION_MIN) {
        heightCtrl?.setErrors({ tooShortForOven: true });
      }
    }
  }
}
