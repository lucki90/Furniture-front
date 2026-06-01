import { FormBuilder, FormGroup } from '@angular/forms';
import { UpperOpenShelfCabinetValidator } from './upper-open-shelf-cabinet-validator';

describe('UpperOpenShelfCabinetValidator', () => {
  let form: FormGroup;
  let validator: UpperOpenShelfCabinetValidator;

  beforeEach(() => {
    const fb = new FormBuilder();
    form = fb.group({
      width: [400],
      height: [720],
      depth: [320],
      shelfQuantity: [2]
    });
    validator = new UpperOpenShelfCabinetValidator();
    validator.validate(form);
  });

  it('accepts the new minimum width of 150 mm', () => {
    form.get('width')?.setValue(150);

    expect(form.get('width')?.valid).toBeTrue();
  });

  it('rejects widths below 150 mm', () => {
    form.get('width')?.setValue(149);

    expect(form.get('width')?.valid).toBeFalse();
  });

  it('accepts shelf quantity of 8', () => {
    form.get('shelfQuantity')?.setValue(8);

    expect(form.get('shelfQuantity')?.valid).toBeTrue();
  });

  it('rejects shelf quantity above 8', () => {
    form.get('shelfQuantity')?.setValue(9);

    expect(form.get('shelfQuantity')?.valid).toBeFalse();
  });
});
