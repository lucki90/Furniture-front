import { FormGroup, Validators } from '@angular/forms';
import { KitchenCabinetValidator } from '../../type-config/validator/kitchen-cabinet-validator';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';

const VALID_WIDTHS = new Set([400, 500, 600, 800, 900]);

/**
 * Validator dla szafki wiszącej z ociekaczem (UPPER_DRAINER).
 * Szerokość wybierana z listy: 400 / 500 / 600 / 800 / 900mm.
 * Wymagane setValidators() przy każdym wywołaniu — czyści stare walidatory poprzedniego typu.
 */
export class UpperDrainerCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    const c = KitchenCabinetConstraints.UPPER_DRAINER;

    // Szerokość: SELECT z 5 wartościami — zastąp poprzednie walidatory (min/max), sprawdź custom
    const widthCtrl = form.get('width');
    widthCtrl?.setValidators([Validators.required]);
    widthCtrl?.updateValueAndValidity({ emitEvent: false });
    if (widthCtrl && !VALID_WIDTHS.has(widthCtrl.value)) {
      widthCtrl.setErrors({ fixedSizes: true });
    }

    // Wysokość: 300–900mm
    form.get('height')?.setValidators([
      Validators.required,
      Validators.min(c.HEIGHT_MIN),
      Validators.max(c.HEIGHT_MAX)
    ]);
    form.get('height')?.updateValueAndValidity();

    // Głębokość: 280–320mm
    form.get('depth')?.setValidators([
      Validators.required,
      Validators.min(c.DEPTH_MIN),
      Validators.max(c.DEPTH_MAX)
    ]);
    form.get('depth')?.updateValueAndValidity();

    // Półki: nieużywane — wyczyść stare walidatory
    form.get('shelfQuantity')?.clearValidators();
    form.get('shelfQuantity')?.updateValueAndValidity({ emitEvent: false });

    form.updateValueAndValidity();
  }
}
