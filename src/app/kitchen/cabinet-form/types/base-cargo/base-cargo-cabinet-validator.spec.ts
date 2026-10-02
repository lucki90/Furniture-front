import { FormBuilder, FormGroup } from '@angular/forms';
import { BaseCargoCabinetValidator } from './base-cargo-cabinet-validator';

describe('BaseCargoCabinetValidator', () => {
  let form: FormGroup;

  beforeEach(() => {
    form = new FormBuilder().group({
      width: [300],
      height: [720],
      depth: [560],
      cargoVariant: ['MECHANISM'],
      drawerQuantity: [3],
      drawerModel: [null],
      cargoBrand: ['BLUM']
    });
    new BaseCargoCabinetValidator().validate(form);
  });

  it('uses the 510–560 mm range for the mechanism variant', () => {
    expectDepth(509, false, 510);
    expectDepth(510, true);
    expectDepth(560, true);
    expectDepth(561, false, undefined, 560);
  });

  it('uses the 300–560 mm range for the drawers variant', () => {
    form.get('cargoVariant')?.setValue('DRAWERS');

    expectDepth(299, false, 300);
    expectDepth(300, true);
    expectDepth(560, true);
    expectDepth(561, false, undefined, 560);
  });

  it('treats a missing variant as the mechanism variant', () => {
    form.get('cargoVariant')?.setValue(null);

    expectDepth(509, false, 510);
    expectDepth(510, true);
  });

  function expectDepth(value: number, valid: boolean, min?: number, max?: number): void {
    const depth = form.get('depth');
    depth?.setValue(value);
    depth?.updateValueAndValidity();

    expect(depth?.valid).toBe(valid);
    if (min !== undefined) {
      expect(depth?.errors?.['min']?.min).toBe(min);
    }
    if (max !== undefined) {
      expect(depth?.errors?.['max']?.max).toBe(max);
    }
  }
});
