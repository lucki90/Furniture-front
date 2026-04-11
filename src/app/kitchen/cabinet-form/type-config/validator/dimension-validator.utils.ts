import { FormGroup, Validators } from '@angular/forms';

/**
 * Constraints interface for dimension validators.
 */
export interface DimensionConstraints {
  WIDTH_MIN: number;
  WIDTH_MAX: number;
  HEIGHT_MIN: number;
  HEIGHT_MAX: number;
  DEPTH_MIN: number;
  DEPTH_MAX: number;
  SHELF_MIN?: number;
  SHELF_MAX?: number;
}

/**
 * Ustawia standardowe walidatory wymiarów (width, height, depth, shelfQuantity) na formularzu szafki.
 * Używane przez: BaseOneDoor, BaseTwoDoor, UpperOneDoor, UpperTwoDoor (i inne standardowe typy).
 */
export function setDimensionValidators(form: FormGroup, constraints: DimensionConstraints): void {
  form.get('width')?.setValidators([
    Validators.required,
    Validators.min(constraints.WIDTH_MIN),
    Validators.max(constraints.WIDTH_MAX)
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

  if (constraints.SHELF_MIN != null && constraints.SHELF_MAX != null) {
    form.get('shelfQuantity')?.setValidators([
      Validators.required,
      Validators.min(constraints.SHELF_MIN),
      Validators.max(constraints.SHELF_MAX)
    ]);
    form.get('shelfQuantity')?.updateValueAndValidity();
  }

  form.get('width')?.updateValueAndValidity();
  form.get('height')?.updateValueAndValidity();
  form.get('depth')?.updateValueAndValidity();
  form.updateValueAndValidity();
}
