import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DefaultKitchenFormFactory } from './model/default-kitchen-form.factory';
import { CabinetFormValidationErrorsService } from './cabinet-form-validation-errors.service';
import { CabinetFormVisibility } from './type-config/preparer/cabinet-form-visibility';
import { CornerCabinetValidator } from './types/corner-cabinet/corner-cabinet-validator';
import { CornerMechanismType } from './model/corner-cabinet.model';

describe('CabinetFormValidationErrorsService', () => {
  let service: CabinetFormValidationErrorsService;
  let form: FormGroup;
  let visibility: CabinetFormVisibility;

  beforeEach(() => {
    service = new CabinetFormValidationErrorsService();
    form = DefaultKitchenFormFactory.create(new FormBuilder());
    visibility = {
      width: true,
      lowerFrontHeightMm: false,
      cornerWidthA: false,
      segments: false
    } as CabinetFormVisibility;
  });

  it('returns dimension errors for visible width/height/depth fields', () => {
    form.get('width')?.setErrors({ widthStep: { message: 'Szerokość musi być wielokrotnością 100 mm' } });
    form.get('height')?.setErrors({ min: { min: 720 } });
    form.get('depth')?.setErrors({ max: { max: 600 } });

    expect(service.getValidationErrors(form, visibility, null)).toEqual([
      'Szerokość musi być wielokrotnością 100 mm',
      'Wysokość: min 720 mm',
      'Głębokość: max 600 mm'
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
      'Szerokość B: max 1200 mm'
    ]);
  });

  it('returns segment summary and per-segment errors when segment section is visible', () => {
    visibility.width = false;
    visibility.segments = true;

    const firstSegment = new FormBuilder().group({
      height: [null, Validators.min(100)],
      drawerQuantity: [null, Validators.required]
    });
    firstSegment.get('height')?.setErrors({ min: { min: 100 } });
    firstSegment.get('drawerQuantity')?.setErrors({ required: true });

    form.setControl('segments', new FormBuilder().array([firstSegment]));

    expect(service.getValidationErrors(form, visibility, 'Dodaj co najmniej jeden segment.')).toEqual([
      'Dodaj co najmniej jeden segment.',
      'Segment 1: wysokość poza zakresem (min 100 mm)',
      'Segment 1: nieprawidłowa liczba szuflad'
    ]);
  });

  it('ignores hidden sections', () => {
    visibility.width = false;
    form.get('width')?.setErrors({ required: true });
    form.get('height')?.setErrors({ min: { min: 720 } });
    form.get('depth')?.setErrors({ max: { max: 600 } });

    expect(service.getValidationErrors(form, visibility, null)).toEqual([]);
  });

  describe('corner cabinet Type B', () => {
    const cornerValidator = new CornerCabinetValidator();

    function cornerVisibility(): CabinetFormVisibility {
      return {
        width: false,
        cornerWidthA: true,
        cornerMechanism: true,
        segments: false,
        lowerFrontHeightMm: false
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
        cornerFrontUchylnyWidthMm: 100
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
        cornerFrontUchylnyWidthMm: 500
      });
      cornerValidator.validate(form);

      const errors = service.getValidationErrors(form, cornerVisibility(), null);

      expect(errors).toEqual([]);
    });
  });
});
