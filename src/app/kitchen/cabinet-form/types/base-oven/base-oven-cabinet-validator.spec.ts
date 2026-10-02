import { FormBuilder } from '@angular/forms';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';
import { BaseOvenCabinetValidator } from './base-oven-cabinet-validator';

describe('BaseOvenCabinetValidator', () => {
  function formFor(height: number, ovenHeightType = 'STANDARD') {
    const form = DefaultKitchenFormFactory.create(new FormBuilder());
    form.patchValue({ kitchenCabinetType: KitchenCabinetType.BASE_OVEN,
      width: 600, height, depth: 560, ovenHeightType, ovenApronEnabled: false });
    new BaseOvenCabinetValidator().validate(form);
    return form;
  }

  for (const height of [699, 703]) {
    it(`rejects a standard oven at ${height} mm, matching the backend`, () => {
      const form = formFor(height);
      expect(form.get('height')?.hasError('tooShortForOven')).toBeTrue();
      expect(form.invalid).toBeTrue();
    });
  }

  it('accepts the 704 mm standard boundary and a 650 mm compact oven', () => {
    expect(formFor(704).valid).toBeTrue();
    expect(formFor(650, 'COMPACT').valid).toBeTrue();
  });

  it('revalidates edited dimensions without reinstalling the validator', () => {
    const form = formFor(850);
    form.get('height')?.setValue(703);
    expect(form.get('height')?.hasError('tooShortForOven')).toBeTrue();
    form.get('height')?.setValue(704);
    expect(form.valid).toBeTrue();
    form.get('width')?.setValue(589);
    expect(form.invalid).toBeTrue();
    form.get('width')?.setValue(600);
    form.get('depth')?.setValue(549);
    expect(form.invalid).toBeTrue();
    form.get('depth')?.setValue(560);
    expect(form.valid).toBeTrue();
  });
});
