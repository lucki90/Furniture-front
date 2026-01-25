import { AbstractControl, ValidatorFn, ValidationErrors } from '@angular/forms';

export function widthStepValidator(minWidth: number, step: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (value === null || value === undefined || value === '') {
      return null;
    }

    const diff = value - minWidth;
    if (diff < 0 || diff % step !== 0) {
      return {
        widthStep: {
          requiredStep: step,
          minWidth: minWidth,
          actualValue: value,
          message: `Szerokość musi być wielokrotnością ${step}mm od ${minWidth}mm`
        }
      };
    }

    return null;
  };
}
