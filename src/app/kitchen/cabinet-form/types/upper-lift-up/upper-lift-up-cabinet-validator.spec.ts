import { FormBuilder, FormGroup } from '@angular/forms';
import { UpperLiftUpCabinetValidator } from './upper-lift-up-cabinet-validator';

describe('UpperLiftUpCabinetValidator', () => {
  let form: FormGroup;
  let validator: UpperLiftUpCabinetValidator;

  beforeEach(() => {
    const fb = new FormBuilder();
    form = fb.group({
      width: [600],
      height: [400],
      depth: [340],
      shelfQuantity: [1]
    });
    validator = new UpperLiftUpCabinetValidator();
    validator.validate(form);
  });

  it('accepts default lift-up dimensions', () => {
    expect(form.valid).toBeTrue();
  });

  it('rejects width below 300 mm', () => {
    form.get('width')?.setValue(299);

    expect(form.get('width')?.valid).toBeFalse();
  });

  it('rejects width above 900 mm', () => {
    form.get('width')?.setValue(901);

    expect(form.get('width')?.valid).toBeFalse();
  });

  it('rejects height below 180 mm', () => {
    form.get('height')?.setValue(179);

    expect(form.get('height')?.valid).toBeFalse();
  });

  it('accepts height at lower bound 180 mm', () => {
    form.get('height')?.setValue(180);

    expect(form.get('height')?.valid).toBeTrue();
  });

  it('accepts tall lift-up front within Aventos HF range (height 1000 mm)', () => {
    form.get('height')?.setValue(1000);

    expect(form.get('height')?.valid).toBeTrue();
  });

  it('rejects height above 1200 mm', () => {
    form.get('height')?.setValue(1201);

    expect(form.get('height')?.valid).toBeFalse();
  });
});
