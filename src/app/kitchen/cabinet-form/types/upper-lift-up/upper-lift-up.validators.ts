import { AbstractControl, ValidationErrors } from '@angular/forms';
import {
  CabinetFormValidationErrorCode,
  cabinetFormValidationError,
} from '../../cabinet-form-validation-error';

/**
 * Walidator nominalnej wysokości górnego frontu HF (fronty asymetryczne TKH, doc §10.4).
 *
 * <p>Pole jest opcjonalne: {@code null}/puste = front symetryczny (skrzydła równej wysokości) — wtedy brak błędu.
 * Gdy wartość jest podana, musi być <strong>dodatnia</strong> (nie zero) i <strong>mniejsza od wysokości szafki</strong>
 * — parytet z backendowym {@code UpperLiftUpKitchenCabinetValidator} (komunikat „Upper front height must be positive
 * and lower than cabinet height"). Zwraca typowany kod błędu tłumaczony przez formularz.</p>
 */
export function hfUpperFrontHeightValidator(control: AbstractControl): ValidationErrors | null {
  const raw = control.value;
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return cabinetFormValidationError(CabinetFormValidationErrorCode.HF_UPPER_FRONT_NOT_POSITIVE);
  }
  const height = Number(control.parent?.get('height')?.value);
  if (Number.isFinite(height) && height > 0 && value >= height) {
    return cabinetFormValidationError(CabinetFormValidationErrorCode.HF_UPPER_FRONT_NOT_BELOW_CABINET);
  }
  return null;
}
