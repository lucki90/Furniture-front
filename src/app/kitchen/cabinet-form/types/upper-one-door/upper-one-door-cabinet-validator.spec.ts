import { FormBuilder, FormGroup } from '@angular/forms';
import { UpperOneDoorCabinetValidator } from './upper-one-door-cabinet-validator';

describe('UpperOneDoorCabinetValidator', () => {
  let form: FormGroup;
  let validator: UpperOneDoorCabinetValidator;

  beforeEach(() => {
    const fb = new FormBuilder();
    form = fb.group({
      width: [400],
      height: [720],
      depth: [320],
      shelfQuantity: [1]
    });
    validator = new UpperOneDoorCabinetValidator();
    validator.validate(form);
  });

  it('accepts book-aligned one-door upper dimensions', () => {
    expect(form.valid).toBeTrue();
  });

  it('rejects width below 300 mm', () => {
    form.get('width')?.setValue(299);

    expect(form.get('width')?.valid).toBeFalse();
  });

  it('rejects height below 600 mm', () => {
    form.get('height')?.setValue(599);

    expect(form.get('height')?.valid).toBeFalse();
  });

  it('rejects height above 1200 mm', () => {
    form.get('height')?.setValue(1201);

    expect(form.get('height')?.valid).toBeFalse();
  });
});
