import { FormBuilder, FormGroup } from '@angular/forms';
import { PantryPassageCabinetValidator } from './pantry-passage-cabinet-validator';

describe('PantryPassageCabinetValidator', () => {
  let form: FormGroup;
  let validator: PantryPassageCabinetValidator;

  beforeEach(() => {
    const fb = new FormBuilder();
    form = fb.group({
      width: [900],
      height: [2200],
      depth: [120],
      shelfQuantity: [0],
      pantryPassageFrontType: ['TWO_DOORS']
    });
    validator = new PantryPassageCabinetValidator();
    validator.validate(form);
  });

  it('accepts the supported pantry-passage dimensions', () => {
    expect(form.valid).toBeTrue();
  });

  it('rejects widths below 450 mm', () => {
    form.get('width')?.setValue(449);

    expect(form.get('width')?.valid).toBeFalse();
  });

  it('rejects depth different than 120 mm', () => {
    form.get('depth')?.setValue(119);

    expect(form.get('depth')?.valid).toBeFalse();
  });

  it('accepts one-door pantry passage up to 600 mm width', () => {
    form.get('pantryPassageFrontType')?.setValue('ONE_DOOR');
    form.get('width')?.setValue(600);

    expect(form.get('width')?.valid).toBeTrue();
  });

  it('rejects one-door pantry passage above 600 mm width', () => {
    form.get('pantryPassageFrontType')?.setValue('ONE_DOOR');
    form.get('width')?.setValue(601);

    expect(form.get('width')?.valid).toBeFalse();
    expect(form.get('width')?.errors?.['message']).toContain('powyzej 600 mm');
  });
});
