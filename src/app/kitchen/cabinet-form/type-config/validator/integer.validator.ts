import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Waliduje, czy niepusta wartość kontrolki jest skończoną liczbą całkowitą. */
export function integerValidator(control: AbstractControl): ValidationErrors | null {
  if (control.value === null || control.value === undefined || control.value === '') {
    return null;
  }

  const value = Number(control.value);
  return Number.isFinite(value) && Number.isInteger(value) ? null : { integer: true };
}
