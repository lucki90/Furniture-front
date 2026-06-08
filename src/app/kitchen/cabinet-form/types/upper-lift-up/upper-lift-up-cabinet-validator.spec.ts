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

  it('rejects height below 300 mm', () => {
    form.get('height')?.setValue(299);

    expect(form.get('height')?.valid).toBeFalse();
  });

  it('rejects height above 600 mm', () => {
    form.get('height')?.setValue(601);

    expect(form.get('height')?.valid).toBeFalse();
  });
});
