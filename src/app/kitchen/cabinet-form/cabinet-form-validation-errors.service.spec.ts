import { TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { signal } from '@angular/core';
import { DefaultKitchenFormFactory } from './model/default-kitchen-form.factory';
import { CabinetFormValidationErrorsService } from './cabinet-form-validation-errors.service';
import { CabinetFormVisibility } from './type-config/preparer/cabinet-form-visibility';
import { CornerCabinetValidator } from './types/corner-cabinet/corner-cabinet-validator';
import { CornerMechanismType } from './model/corner-cabinet.model';
import { LanguageService } from '../../service/language.service';
import { AppLanguage } from '../../service/language.service';
import {
  CabinetFormValidationErrorCode,
  cabinetFormValidationError,
} from './cabinet-form-validation-error';

function makeLanguageServiceStub(lang: AppLanguage): Partial<LanguageService> {
  return { lang: signal(lang).asReadonly() };
}

describe('CabinetFormValidationErrorsService', () => {
  let service: CabinetFormValidationErrorsService;
  let form: FormGroup;
  let visibility: CabinetFormVisibility;

  function setup(lang: AppLanguage = 'pl'): void {
    TestBed.configureTestingModule({
      providers: [
        CabinetFormValidationErrorsService,
        { provide: LanguageService, useValue: makeLanguageServiceStub(lang) },
      ],
    });
    service = TestBed.inject(CabinetFormValidationErrorsService);
    form = DefaultKitchenFormFactory.create(new FormBuilder());
    visibility = {
      width: true,
      lowerFrontHeightMm: false,
      cornerWidthA: false,
      segments: false,
    } as CabinetFormVisibility;
  }

  beforeEach(() => {
    setup('pl');
  });

  it('returns dimension errors for visible width/height/depth fields', () => {
    form.get('width')?.setErrors({ widthStep: { requiredStep: 100, minWidth: 400 } });
    form.get('height')?.setErrors({ min: { min: 720 } });
    form.get('depth')?.setErrors({ max: { max: 600 } });

    expect(service.getValidationErrors(form, visibility, null)).toEqual([
      'Szerokość musi być wielokrotnością 100mm od 400mm',
      'Wysokość: min 720 mm',
      'Głębokość: max 600 mm',
    ]);
  });

  it('returns lower front and corner errors only when those sections are visible', () => {
    visibility.lowerFrontHeightMm = true;
    visibility.cornerWidthA = true;
    form.get('lowerFrontHeightMm')?.setErrors({ required: true });
    form.get('cornerWidthA')?.setErrors({ min: { min: 900 } });
    form.get('cornerWidthB')?.setErrors({ max: { max: 1200 } });

    expect(service.getValidationErrors(form, visibility, null)).toEqual([
      'Wysokość frontu zamrażarki jest wymagana',
      'Szerokość A: min 900 mm',
      'Szerokość B: max 1200 mm',
    ]);
  });

  it('returns segment summary and per-segment errors when segment section is visible', () => {
    visibility.width = false;
    visibility.segments = true;

    const firstSegment = new FormBuilder().group({
      height: [null, Validators.min(100)],
      drawerQuantity: [null, Validators.required],
    });
    firstSegment.get('height')?.setErrors({ min: { min: 100 } });
    firstSegment.get('drawerQuantity')?.setErrors({ required: true });

    form.setControl('segments', new FormBuilder().array([firstSegment]));

    expect(service.getValidationErrors(form, visibility, 'Dodaj co najmniej jeden segment.')).toEqual([
      'Dodaj co najmniej jeden segment.',
      'Segment 1: wysokość poza zakresem (min 100 mm)',
      'Segment 1: nieprawidłowa liczba szuflad',
    ]);
  });

  it('ignores hidden sections', () => {
    visibility.width = false;
    form.get('width')?.setErrors({ required: true });
    form.get('height')?.setErrors({ min: { min: 720 } });
    form.get('depth')?.setErrors({ max: { max: 600 } });

    expect(service.getValidationErrors(form, visibility, null)).toEqual([]);
  });

  describe('English translations', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      setup('en');
    });

    it('returns English dimension labels when lang=en', () => {
      form.get('height')?.setErrors({ min: { min: 720 } });
      form.get('depth')?.setErrors({ max: { max: 600 } });

      expect(service.getValidationErrors(form, visibility, null)).toEqual([
        'Height: min 720 mm',
        'Depth: max 600 mm',
      ]);
    });

    it('returns English lower front required error when lang=en', () => {
      visibility.lowerFrontHeightMm = true;
      form.get('lowerFrontHeightMm')?.setErrors({ required: true });

      expect(service.getValidationErrors(form, visibility, null)).toContain(
        'Freezer front height is required'
      );
    });

    it('returns English segment error when lang=en', () => {
      visibility.width = false;
      visibility.segments = true;

      const seg = new FormBuilder().group({ height: [null, Validators.min(100)], drawerQuantity: [null] });
      seg.get('height')?.setErrors({ min: { min: 100 } });
      form.setControl('segments', new FormBuilder().array([seg]));

      expect(service.getValidationErrors(form, visibility, null)).toContain(
        'Segment 1: height out of range (min 100 mm)'
      );
    });

    it('translates a typed pantry width error in the validation summary', () => {
      form.get('width')?.setErrors(
        cabinetFormValidationError(CabinetFormValidationErrorCode.PANTRY_ONE_DOOR_TOO_WIDE)
      );

      expect(service.getValidationErrors(form, visibility, null)).toContain(
        'For widths above 600 mm, select the two-door variant.'
      );
    });

    it('translates typed HF and Magic Corner errors inline', () => {
      const hfControl = form.get('hfUpperFrontHeightMm');
      hfControl?.markAsTouched();
      hfControl?.setErrors(
        cabinetFormValidationError(CabinetFormValidationErrorCode.HF_UPPER_FRONT_NOT_POSITIVE)
      );
      const systemLineControl = form.get('cornerSystemLine');
      systemLineControl?.markAsTouched();
      systemLineControl?.setErrors(
        cabinetFormValidationError(CabinetFormValidationErrorCode.MAGIC_COMFORT_LINE_400_UNSUPPORTED)
      );

      expect(service.getControlError(hfControl)).toBe(
        'Upper front height must be greater than 0 (leave empty for a symmetric front)'
      );
      expect(service.getControlError(systemLineControl)).toBe(
        'Magic Corner Comfort does not support line 400 — select line 450 or higher.'
      );
    });
  });

  describe('corner cabinet Type B', () => {
    const cornerValidator = new CornerCabinetValidator();

    function cornerVisibility(): CabinetFormVisibility {
      return {
        width: false,
        cornerWidthA: true,
        cornerMechanism: true,
        segments: false,
        lowerFrontHeightMm: false,
      } as unknown as CabinetFormVisibility;
    }

    it('surfaces the front uchylny error for an invalid Type B corner', () => {
      form.patchValue({
        kitchenCabinetType: 'CORNER_CABINET',
        cornerMechanism: CornerMechanismType.BLIND_CORNER,
        cornerWidthA: 1000,
        cornerShelfQuantity: 1,
        height: 720,
        depth: 510,
        cornerFrontUchylnyWidthMm: 100,
      });
      cornerValidator.validate(form);

      const errors = service.getValidationErrors(form, cornerVisibility(), null);

      expect(errors.some(e => e.startsWith('Szerokość frontu uchylnego'))).toBeTrue();
    });

    it('surfaces a required mechanism error when mechanism is missing', () => {
      form.get('cornerMechanism')?.setValue(null);
      form.get('cornerMechanism')?.setValidators([Validators.required]);
      form.get('cornerMechanism')?.updateValueAndValidity();

      const errors = service.getValidationErrors(form, cornerVisibility(), null);

      expect(errors).toContain('Wybierz system organizacji wewnętrznej');
    });

    it('returns no corner errors for a fully valid Type B corner', () => {
      form.patchValue({
        kitchenCabinetType: 'CORNER_CABINET',
        cornerMechanism: CornerMechanismType.BLIND_CORNER,
        cornerWidthA: 1000,
        cornerShelfQuantity: 1,
        height: 720,
        depth: 510,
        cornerFrontUchylnyWidthMm: 500,
      });
      cornerValidator.validate(form);

      const errors = service.getValidationErrors(form, cornerVisibility(), null);

      expect(errors).toEqual([]);
    });
  });
});
