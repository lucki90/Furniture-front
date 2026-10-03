import { FormBuilder, FormGroup } from '@angular/forms';
import { UpperHoodCabinetValidator } from './upper-hood-cabinet-validator';
import { BaseOneDoorCabinetValidator } from '../base-one-door/base-one-door-cabinet-validator';

describe('UpperHoodCabinetValidator', () => {
  let form: FormGroup;
  beforeEach(() => {
    form = new FormBuilder().group({ kitchenCabinetType: 'UPPER_HOOD', width: 600, height: 500,
      depth: 350, shelfQuantity: 0, hoodScreenEnabled: false, hoodScreenHeightMm: 100 });
  });

  it('revalidates dimensions after user edits and rejects empty dimensions', () => {
    new UpperHoodCabinetValidator().validate(form);
    for (const [field, value] of [['width', 200], ['height', 100], ['depth', 500], ['width', null]] as const) {
      form.get(field)?.setValue(value);
      expect(form.get(field)?.invalid).withContext(field).toBeTrue();
    }
  });

  it('replaces base cabinet constraints and restores them when switching back', () => {
    const base = new BaseOneDoorCabinetValidator();
    form.patchValue({ width: 600, height: 720, depth: 560, shelfQuantity: 1 });
    base.validate(form);
    form.patchValue({ height: 500, depth: 350 });
    new UpperHoodCabinetValidator().validate(form);
    form.get('depth')?.setValue(350);
    expect(form.valid).toBeTrue();
    form.patchValue({ kitchenCabinetType: 'BASE_ONE_DOOR', height: 720, depth: 560 });
    base.validate(form);
    form.get('depth')?.setValue(350);
    expect(form.get('depth')?.invalid).toBeTrue();
  });

  it('validates an enabled screen and clears errors for other types', () => {
    new UpperHoodCabinetValidator().validate(form);
    form.patchValue({ hoodScreenEnabled:true, hoodScreenHeightMm:10 });
    expect(form.invalid).toBeTrue();
    form.get('hoodScreenHeightMm')?.setValue(100);
    expect(form.valid).toBeTrue();
    form.get('hoodScreenHeightMm')?.setValue(10);
    form.patchValue({ kitchenCabinetType:'BASE_ONE_DOOR', height:720, depth:560, shelfQuantity:1 });
    new BaseOneDoorCabinetValidator().validate(form);
    form.get('hoodScreenHeightMm')?.updateValueAndValidity();
    expect(form.valid).toBeTrue();
  });
});
