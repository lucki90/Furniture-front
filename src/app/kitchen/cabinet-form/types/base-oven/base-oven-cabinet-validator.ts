import { FormGroup } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { setDimensionValidators } from '../../type-config/validator/dimension-validator.utils';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';
import { OvenHeightType, OVEN_SLOT_HEIGHT } from './oven-cabinet.model';

export class BaseOvenCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    const c = KitchenCabinetConstraints.BASE_OVEN;
    setDimensionValidators(form, c);

    const heightCtrl = form.get('height');
    heightCtrl?.addValidators(control => {
      if (form.get('kitchenCabinetType')?.value !== KitchenCabinetType.BASE_OVEN) return null;
      const h = control.value;
      if (h == null || h === '' || h < c.HEIGHT_MIN || h > c.HEIGHT_MAX) return null;
      const ovenType: OvenHeightType = form.get('ovenHeightType')?.value ?? OvenHeightType.STANDARD;
      const ovenSlot = OVEN_SLOT_HEIGHT[ovenType] ?? OVEN_SLOT_HEIGHT[OvenHeightType.STANDARD];
      const apronH = form.get('ovenApronEnabled')?.value
        ? (form.get('ovenApronHeightMm')?.value ?? 0) : 0;
      const lowerSection = h - 3 * 18 - ovenSlot - apronH;
      return lowerSection < c.LOWER_SECTION_MIN ? { tooShortForOven: true } : null;
    });

    const apronCtrl = form.get('ovenApronHeightMm');
    apronCtrl?.setValidators(control => {
      if (form.get('kitchenCabinetType')?.value !== KitchenCabinetType.BASE_OVEN
        || !form.get('ovenApronEnabled')?.value) return null;
      return control.value < c.APRON_MIN || control.value > c.APRON_MAX
        ? { outOfRange: true } : null;
    });
    heightCtrl?.updateValueAndValidity({ emitEvent: false });
    apronCtrl?.updateValueAndValidity({ emitEvent: false });
  }
}
