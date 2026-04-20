import { Injectable } from '@angular/core';
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import { CabinetFormVisibility } from './type-config/preparer/cabinet-form-visibility';

@Injectable({ providedIn: 'root' })
export class CabinetFormValidationErrorsService {

  // TODO(CODEX): Validation messages are still hardcoded on the frontend and only in Polish.
  // This makes i18n and future rule changes harder; they should eventually move to a proper
  // translation layer, and some domain-specific messages should be aligned with backend rules.
  getValidationErrors(
    form: FormGroup,
    visibility: CabinetFormVisibility,
    segmentHeightError: string | null
  ): string[] {
    const errors: string[] = [];

    if (visibility.width !== false) {
      this.collectDimensionsErrors(form, errors);
    }

    if (visibility.lowerFrontHeightMm) {
      this.collectLowerFrontErrors(form, errors);
    }

    if (visibility.cornerWidthA) {
      this.collectCornerErrors(form, errors);
    }

    if (visibility.segments) {
      this.collectSegmentErrors(form, segmentHeightError, errors);
    }

    return errors;
  }

  private collectDimensionsErrors(form: FormGroup, errors: string[]): void {
    this.pushDimensionError(errors, form.get('width'), {
      required: 'Szerokosc jest wymagana',
      minLabel: 'Szerokosc',
      maxLabel: 'Szerokosc',
      fallback: null
    });

    this.pushDimensionError(errors, form.get('height'), {
      required: null,
      minLabel: 'Wysokosc',
      maxLabel: 'Wysokosc',
      fallback: 'Wysokosc: nieprawidlowa wartosc'
    });

    this.pushDimensionError(errors, form.get('depth'), {
      required: null,
      minLabel: 'Glebokosc',
      maxLabel: 'Glebokosc',
      fallback: 'Glebokosc: nieprawidlowa wartosc'
    });
  }

  private collectLowerFrontErrors(form: FormGroup, errors: string[]): void {
    const control = form.get('lowerFrontHeightMm');
    if (!control?.invalid) {
      return;
    }

    if (control.errors?.['min']) {
      errors.push(`Front zamrazarki: min ${control.errors['min'].min} mm`);
      return;
    }

    if (control.errors?.['max']) {
      errors.push(`Front zamrazarki: max ${control.errors['max'].max} mm`);
      return;
    }

    if (control.errors?.['required']) {
      errors.push('Wysokosc frontu zamrazarki jest wymagana');
    }
  }

  private collectCornerErrors(form: FormGroup, errors: string[]): void {
    this.pushRangeError(errors, form.get('cornerWidthA'), 'Szerokosc A');
    this.pushRangeError(errors, form.get('cornerWidthB'), 'Szerokosc B');
  }

  private collectSegmentErrors(
    form: FormGroup,
    segmentHeightError: string | null,
    errors: string[]
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
        const minSuffix = typeof minValue === 'number' ? ` (min ${minValue} mm)` : '';
        errors.push(`Segment ${index + 1}: wysokosc poza zakresem${minSuffix}`);
      }

      if (drawerQuantityControl?.invalid) {
        errors.push(`Segment ${index + 1}: nieprawidlowa liczba szuflad`);
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
    }
  ): void {
    if (!control?.invalid) {
      return;
    }

    if (control.errors?.['widthStep']) {
      errors.push(control.errors['widthStep'].message);
      return;
    }

    if (control.errors?.['min']) {
      errors.push(`${options.minLabel}: min ${control.errors['min'].min} mm`);
      return;
    }

    if (control.errors?.['max']) {
      errors.push(`${options.maxLabel}: max ${control.errors['max'].max} mm`);
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

  private pushRangeError(errors: string[], control: AbstractControl | null, label: string): void {
    if (!control?.invalid) {
      return;
    }

    if (control.errors?.['min']) {
      errors.push(`${label}: min ${control.errors['min'].min} mm`);
      return;
    }

    if (control.errors?.['max']) {
      errors.push(`${label}: max ${control.errors['max'].max} mm`);
    }
  }
}
