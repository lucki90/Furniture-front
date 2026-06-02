import { FormBuilder, FormGroup } from '@angular/forms';
import { UpperTwoDoorCabinetValidator } from './upper-two-door-cabinet-validator';

describe('UpperTwoDoorCabinetValidator', () => {
  let form: FormGroup;
  let validator: UpperTwoDoorCabinetValidator;

  beforeEach(() => {
    const fb = new FormBuilder();
    form = fb.group({
      width: [600],
      height: [720],
      depth: [320],
      shelfQuantity: [1]
    });
    validator = new UpperTwoDoorCabinetValidator();
    validator.validate(form);
  });

  it('accepts book-aligned two-door upper dimensions', () => {
    expect(form.valid).toBeTrue();
  });

  it('rejects width below 600 mm', () => {
    form.get('width')?.setValue(599);

    expect(form.get('width')?.valid).toBeFalse();
  });

  it('rejects width above 1000 mm', () => {
    form.get('width')?.setValue(1001);

    expect(form.get('width')?.valid).toBeFalse();
  });

  it('rejects height above 1200 mm', () => {
    form.get('height')?.setValue(1201);

    expect(form.get('height')?.valid).toBeFalse();
  });
});
