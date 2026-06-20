import { ValidationErrors } from '@angular/forms';

export const CABINET_FORM_VALIDATION_ERROR_KEY = 'cabinetValidation';

export const CabinetFormValidationErrorCode = {
  PANTRY_ONE_DOOR_TOO_WIDE: 'PANTRY_ONE_DOOR_TOO_WIDE',
  HF_UPPER_FRONT_NOT_POSITIVE: 'HF_UPPER_FRONT_NOT_POSITIVE',
  HF_UPPER_FRONT_NOT_BELOW_CABINET: 'HF_UPPER_FRONT_NOT_BELOW_CABINET',
  MAGIC_COMFORT_LINE_400_UNSUPPORTED: 'MAGIC_COMFORT_LINE_400_UNSUPPORTED',
} as const;

export type CabinetFormValidationErrorCode =
  typeof CabinetFormValidationErrorCode[keyof typeof CabinetFormValidationErrorCode];

export interface CabinetFormValidationError {
  code: CabinetFormValidationErrorCode;
}

export function cabinetFormValidationError(code: CabinetFormValidationErrorCode): ValidationErrors {
  return {
    [CABINET_FORM_VALIDATION_ERROR_KEY]: { code } satisfies CabinetFormValidationError,
  };
}

export function readCabinetFormValidationError(
  errors: ValidationErrors | null | undefined
): CabinetFormValidationError | null {
  const error = errors?.[CABINET_FORM_VALIDATION_ERROR_KEY] as CabinetFormValidationError | undefined;
  return error?.code ? error : null;
}
