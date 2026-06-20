import { Injectable, inject } from '@angular/core';
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import { LanguageService } from '../../service/language.service';
import { readCabinetFormValidationError } from './cabinet-form-validation-error';
import { CABINET_FORM_MESSAGES } from './cabinet-form-validation-messages';
import { CabinetFormVisibility } from './type-config/preparer/cabinet-form-visibility';

@Injectable({ providedIn: 'root' })
export class CabinetFormValidationErrorsService {
  private readonly languageService = inject(LanguageService);

  getControlError(control: AbstractControl | null | undefined): string | null {
    if (!control?.touched || !control.errors) {
      return null;
    }

    const msg = CABINET_FORM_MESSAGES[this.languageService.lang()];
    const customError = readCabinetFormValidationError(control.errors);
    if (customError) {
      return msg.customErrors[customError.code];
    }
    if (control.errors['required']) {
      return msg.inlineRequired;
    }
    if (control.errors['min']) {
      return `Min: ${control.errors['min'].min}`;
    }
    if (control.errors['max']) {
      return `Max: ${control.errors['max'].max}`;
    }
    if (control.errors['widthStep']) {
      const error = control.errors['widthStep'];
      return msg.widthStep(error.requiredStep, error.minWidth);
    }
    return msg.inlineInvalid;
  }

  getValidationErrors(
    form: FormGroup,
    visibility: CabinetFormVisibility,
    segmentHeightError: string | null
  ): string[] {
    const msg = CABINET_FORM_MESSAGES[this.languageService.lang()];
    const errors: string[] = [];

    if (visibility.width !== false) {
      this.collectDimensionsErrors(form, errors, msg);
    }

    if (visibility.lowerFrontHeightMm) {
      this.collectLowerFrontErrors(form, errors, msg);
    }

    if (visibility.cornerWidthA) {
      this.collectCornerErrors(form, errors, msg);
    }

    if (visibility.segments) {
      this.collectSegmentErrors(form, segmentHeightError, errors, msg);
    }

    return errors;
  }

  private collectDimensionsErrors(
    form: FormGroup,
    errors: string[],
    msg: typeof CABINET_FORM_MESSAGES['pl']
  ): void {
    this.pushDimensionError(errors, form.get('width'), {
      required: msg.widthRequired,
      minLabel: msg.labels.width,
      maxLabel: msg.labels.width,
      fallback: null,
      msg,
    });

    this.pushDimensionError(errors, form.get('height'), {
      required: null,
      minLabel: msg.labels.height,
      maxLabel: msg.labels.height,
      fallback: msg.heightFallback,
      msg,
    });

    this.pushDimensionError(errors, form.get('depth'), {
      required: null,
      minLabel: msg.labels.depth,
      maxLabel: msg.labels.depth,
      fallback: msg.depthFallback,
      msg,
    });
  }

  private collectLowerFrontErrors(
    form: FormGroup,
    errors: string[],
    msg: typeof CABINET_FORM_MESSAGES['pl']
  ): void {
    const control = form.get('lowerFrontHeightMm');
    if (!control?.invalid) {
      return;
    }

    if (control.errors?.['min']) {
      errors.push(msg.lowerFrontMin(control.errors['min'].min));
      return;
    }

    if (control.errors?.['max']) {
      errors.push(msg.lowerFrontMax(control.errors['max'].max));
      return;
    }

    if (control.errors?.['required']) {
      errors.push(msg.lowerFrontRequired);
    }
  }

  private collectCornerErrors(
    form: FormGroup,
    errors: string[],
    msg: typeof CABINET_FORM_MESSAGES['pl']
  ): void {
    this.pushRangeError(errors, form.get('cornerWidthA'), msg.labels.cornerWidthA, msg);
    this.pushRangeError(errors, form.get('cornerWidthB'), msg.labels.cornerWidthB, msg);
    this.pushRangeError(errors, form.get('height'), msg.labels.height, msg);
    this.pushRangeError(errors, form.get('depth'), msg.labels.depth, msg);
    this.pushRangeError(errors, form.get('cornerShelfQuantity'), msg.labels.cornerShelfQty, msg);

    // Type B — front uchylny, parametry systemu, panel ślepy.
    this.pushRangeError(errors, form.get('cornerFrontUchylnyWidthMm'), msg.labels.cornerFrontUchylny, msg);
    this.pushRangeError(errors, form.get('cornerOpeningAngleDeg'), msg.labels.cornerOpeningAngle, msg);
    this.pushRangeError(errors, form.get('blindPanelVisibleWidthMm'), msg.labels.blindPanelVisible, msg);

    const mechanism = form.get('cornerMechanism');
    if (mechanism?.invalid && mechanism.errors?.['required']) {
      errors.push(msg.mechanismRequired);
    }
  }

  private collectSegmentErrors(
    form: FormGroup,
    segmentHeightError: string | null,
    errors: string[],
    msg: typeof CABINET_FORM_MESSAGES['pl']
  ): void {
    if (segmentHeightError) {
      errors.push(segmentHeightError);
    }

    const segmentsArray = form.get('segments');
    if (!(segmentsArray instanceof FormArray)) {
      return;
    }

    segmentsArray.controls.forEach((segment, index) => {
      const segmentGroup = segment as FormGroup;
      const heightControl = segmentGroup.get('height');
      const drawerQuantityControl = segmentGroup.get('drawerQuantity');

      if (heightControl?.invalid) {
        const minValue = heightControl.errors?.['min']?.min;
        errors.push(msg.segmentHeightError(index + 1, typeof minValue === 'number' ? minValue : undefined));
      }

      if (drawerQuantityControl?.invalid) {
        errors.push(msg.segmentDrawersError(index + 1));
      }
    });
  }

  private pushDimensionError(
    errors: string[],
    control: AbstractControl | null,
    options: {
      required: string | null;
      minLabel: string;
      maxLabel: string;
      fallback: string | null;
      msg: typeof CABINET_FORM_MESSAGES['pl'];
    }
  ): void {
    if (!control?.invalid) {
      return;
    }

    if (control.errors?.['widthStep']) {
      const e = control.errors['widthStep'];
      errors.push(options.msg.widthStep(e.requiredStep, e.minWidth));
      return;
    }

    const customError = readCabinetFormValidationError(control.errors);
    if (customError) {
      errors.push(options.msg.customErrors[customError.code]);
      return;
    }

    if (control.errors?.['min']) {
      errors.push(options.msg.dimensionMin(options.minLabel, control.errors['min'].min));
      return;
    }

    if (control.errors?.['max']) {
      errors.push(options.msg.dimensionMax(options.maxLabel, control.errors['max'].max));
      return;
    }

    if (control.errors?.['required'] && options.required) {
      errors.push(options.required);
      return;
    }

    if (options.fallback) {
      errors.push(options.fallback);
    }
  }

  private pushRangeError(
    errors: string[],
    control: AbstractControl | null,
    label: string,
    msg: typeof CABINET_FORM_MESSAGES['pl']
  ): void {
    if (!control?.invalid) {
      return;
    }

    if (control.errors?.['min']) {
      errors.push(msg.dimensionMin(label, control.errors['min'].min));
      return;
    }

    if (control.errors?.['max']) {
      errors.push(msg.dimensionMax(label, control.errors['max'].max));
      return;
    }

    if (control.errors?.['required']) {
      errors.push(msg.rangeRequired(label));
    }
  }
}
