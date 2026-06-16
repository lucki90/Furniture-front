import { Injectable } from '@angular/core';
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';
import { CabinetFormVisibility } from './type-config/preparer/cabinet-form-visibility';

@Injectable({ providedIn: 'root' })
export class CabinetFormValidationErrorsService {

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
      required: 'Szerokość jest wymagana',
      minLabel: 'Szerokość',
      maxLabel: 'Szerokość',
      fallback: null
    });

    this.pushDimensionError(errors, form.get('height'), {
      required: null,
      minLabel: 'Wysokość',
      maxLabel: 'Wysokość',
      fallback: 'Wysokość: nieprawidłowa wartość'
    });

    this.pushDimensionError(errors, form.get('depth'), {
      required: null,
      minLabel: 'Głębokość',
      maxLabel: 'Głębokość',
      fallback: 'Głębokość: nieprawidłowa wartość'
    });
  }

  private collectLowerFrontErrors(form: FormGroup, errors: string[]): void {
    const control = form.get('lowerFrontHeightMm');
    if (!control?.invalid) {
      return;
    }

    if (control.errors?.['min']) {
      errors.push(`Front zamrażarki: min ${control.errors['min'].min} mm`);
      return;
    }

    if (control.errors?.['max']) {
      errors.push(`Front zamrażarki: max ${control.errors['max'].max} mm`);
      return;
    }

    if (control.errors?.['required']) {
      errors.push('Wysokość frontu zamrażarki jest wymagana');
    }
  }

  private collectCornerErrors(form: FormGroup, errors: string[]): void {
    this.pushRangeError(errors, form.get('cornerWidthA'), 'Szerokość A');
    this.pushRangeError(errors, form.get('cornerWidthB'), 'Szerokość B');
    this.pushRangeError(errors, form.get('height'), 'Wysokość');
    this.pushRangeError(errors, form.get('depth'), 'Głębokość');
    this.pushRangeError(errors, form.get('cornerShelfQuantity'), 'Liczba półek');

    // Type B — front uchylny, parametry systemu, panel ślepy.
    this.pushRangeError(errors, form.get('cornerFrontUchylnyWidthMm'), 'Szerokość frontu uchylnego');
    this.pushRangeError(errors, form.get('cornerOpeningAngleDeg'), 'Kąt otwarcia');
    this.pushRangeError(errors, form.get('blindPanelVisibleWidthMm'), 'Szerokość widocznej części frontu ślepego');

    const mechanism = form.get('cornerMechanism');
    if (mechanism?.invalid && mechanism.errors?.['required']) {
      errors.push('Wybierz system organizacji wewnętrznej');
    }
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
        errors.push(`Segment ${index + 1}: wysokość poza zakresem${minSuffix}`);
      }

      if (drawerQuantityControl?.invalid) {
        errors.push(`Segment ${index + 1}: nieprawidłowa liczba szuflad`);
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

    if (control.errors?.['message']) {
      errors.push(control.errors['message']);
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
      return;
    }

    if (control.errors?.['required']) {
      errors.push(`${label}: wartość wymagana`);
    }
  }
}
