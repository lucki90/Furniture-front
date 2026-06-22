import { FormBuilder, FormGroup } from '@angular/forms';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { KitchenCabinetValidator } from './kitchen-cabinet-validator';
import { BaseCargoCabinetValidator } from '../../types/base-cargo/base-cargo-cabinet-validator';
import { BaseCooktopCabinetValidator } from '../../types/base-cooktop/base-cooktop-cabinet-validator';
import { BaseWithDrawersCabinetValidator } from '../../types/base-with-drawers/base-with-drawers-cabinet-validator';

describe('Walidacja całkowitej liczby szuflad', () => {
  const cases: Array<{ name: string; validator: KitchenCabinetValidator }> = [
    { name: 'BASE_WITH_DRAWERS', validator: new BaseWithDrawersCabinetValidator() },
    { name: 'BASE_CARGO', validator: new BaseCargoCabinetValidator() },
    { name: 'BASE_COOKTOP', validator: new BaseCooktopCabinetValidator() }
  ];

  let form: FormGroup;

  beforeEach(() => {
    form = DefaultKitchenFormFactory.create(new FormBuilder());
    form.patchValue({
      width: 600,
      height: 720,
      depth: 560,
      drawerQuantity: 3
    });
  });

  cases.forEach(({ name, validator }) => {
    it(`${name} odrzuca ułamkową liczbę szuflad`, () => {
      validator.validate(form);
      form.get('drawerQuantity')?.setValue(2.4);

      expect(form.get('drawerQuantity')?.errors?.['integer']).toBeTrue();
    });

    it(`${name} akceptuje całkowitą liczbę szuflad`, () => {
      validator.validate(form);
      form.get('drawerQuantity')?.setValue(2);

      expect(form.get('drawerQuantity')?.errors).toBeNull();
    });
  });

  it('BASE_COOKTOP nie wymaga liczby szuflad dla frontu bez szuflad', () => {
    form.patchValue({
      cooktopFrontType: 'ONE_DOOR',
      drawerQuantity: null
    });

    new BaseCooktopCabinetValidator().validate(form);

    expect(form.get('drawerQuantity')?.errors).toBeNull();
  });

  it('BASE_COOKTOP reaktywnie waliduje zakres wymiarów', () => {
    const validator = new BaseCooktopCabinetValidator();
    validator.validate(form);

    form.get('width')?.setValue(449);
    form.get('height')?.setValue(901);
    form.get('depth')?.setValue(399);

    expect(form.get('width')?.errors?.['min']).toBeTruthy();
    expect(form.get('height')?.errors?.['max']).toBeTruthy();
    expect(form.get('depth')?.errors?.['min']).toBeTruthy();

    form.patchValue({ width: 450, height: 900, depth: 400 });

    expect(form.get('width')?.errors).toBeNull();
    expect(form.get('height')?.errors).toBeNull();
    expect(form.get('depth')?.errors).toBeNull();
  });
});
