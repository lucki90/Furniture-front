import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DefaultKitchenFormFactory } from './model/default-kitchen-form.factory';
import { CabinetFormValidationErrorsService } from './cabinet-form-validation-errors.service';
import { CabinetFormVisibility } from './type-config/preparer/cabinet-form-visibility';

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
    form.get('width')?.setErrors({ widthStep: { message: 'Szerokosc musi byc wielokrotnoscia 100 mm' } });
    form.get('height')?.setErrors({ min: { min: 720 } });
    form.get('depth')?.setErrors({ max: { max: 600 } });

    expect(service.getValidationErrors(form, visibility, null)).toEqual([
      'Szerokosc musi byc wielokrotnoscia 100 mm',
      'Wysokosc: min 720 mm',
      'Glebokosc: max 600 mm'
    ]);
  });

  it('returns lower front and corner errors only when those sections are visible', () => {
    visibility.lowerFrontHeightMm = true;
    visibility.cornerWidthA = true;
    form.get('lowerFrontHeightMm')?.setErrors({ required: true });
    form.get('cornerWidthA')?.setErrors({ min: { min: 900 } });
    form.get('cornerWidthB')?.setErrors({ max: { max: 1200 } });

    expect(service.getValidationErrors(form, visibility, null)).toEqual([
      'Wysokosc frontu zamrazarki jest wymagana',
      'Szerokosc A: min 900 mm',
      'Szerokosc B: max 1200 mm'
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
      'Segment 1: wysokosc poza zakresem (min 100 mm)',
      'Segment 1: nieprawidlowa liczba szuflad'
    ]);
  });

  it('ignores hidden sections', () => {
    visibility.width = false;
    form.get('width')?.setErrors({ required: true });
    form.get('height')?.setErrors({ min: { min: 720 } });
    form.get('depth')?.setErrors({ max: { max: 600 } });

    expect(service.getValidationErrors(form, visibility, null)).toEqual([]);
  });
});
