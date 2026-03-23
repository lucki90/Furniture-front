import { AbstractControl } from '@angular/forms';

/**
 * Zwraca komunikat błędu dla podanego AbstractControl (po touched).
 * Obsługuje standardowe błędy Angular: required, min, max + custom message (widthStep, message).
 *
 * Użycie w komponencie:
 *   getFieldError(name: string): string | null {
 *     return getFormError(this.form.get(name));
 *   }
 */
export function getFormError(ctrl: AbstractControl | null | undefined): string | null {
  if (!ctrl?.touched || !ctrl.errors) return null;
  if (ctrl.errors['required']) return 'Wymagane';
  if (ctrl.errors['min']) return `Min: ${ctrl.errors['min'].min}`;
  if (ctrl.errors['max']) return `Max: ${ctrl.errors['max'].max}`;
  if (ctrl.errors['widthStep']) return ctrl.errors['widthStep'].message;
  if (ctrl.errors['message']) return ctrl.errors['message'];
  return 'Błąd';
}
