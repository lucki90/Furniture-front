import { AbstractControl } from '@angular/forms';

/**
 * @deprecated Użyj CabinetFormValidationErrorsService.getControlError() — obsługuje
 * wielojęzyczność, typowane błędy cabinetValidation i aktualny format widthStep.
 */
export function getFormError(ctrl: AbstractControl | null | undefined): string | null {
  if (!ctrl?.touched || !ctrl.errors) return null;
  if (ctrl.errors['required']) return 'Wymagane';
  if (ctrl.errors['min']) return `Min: ${ctrl.errors['min'].min}`;
  if (ctrl.errors['max']) return `Max: ${ctrl.errors['max'].max}`;
  return 'Błąd';
}
