import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { BaseWithDrawersCabinetValidator } from './base-with-drawers-cabinet-validator';

describe('BaseWithDrawersCabinetValidator CUSTOM', () => {
  let form: FormGroup;
  beforeEach(() => {
    const fb = new FormBuilder();
    form = fb.group({ kitchenCabinetType: 'BASE_WITH_DRAWERS', width: 600, height: 720, depth: 560,
      drawerQuantity: 3, drawerLayoutType: 'CUSTOM', drawerCustomHeightsMm: fb.array([236,236,236]) });
    new BaseWithDrawersCabinetValidator().validate(form);
  });
  it('rejects missing, fractional and out-of-range heights after edits', () => {
    const heights = form.get('drawerCustomHeightsMm') as FormArray;
    expect(form.valid).toBeTrue();
    for (const value of [null, 59, 701, 236.5]) {
      heights.at(0).setValue(value);
      expect(form.invalid).withContext(String(value)).toBeTrue();
    }
    heights.at(0).setValue(236);
    expect(form.valid).toBeTrue();
    heights.removeAt(2);
    expect(form.invalid).toBeTrue();
  });
  it('ignores custom heights in other layouts and cabinet types', () => {
    (form.get('drawerCustomHeightsMm') as FormArray).at(0).setValue(null);
    form.get('drawerLayoutType')?.setValue('EQUAL');
    expect(form.valid).toBeTrue();
    form.patchValue({ drawerLayoutType:'CUSTOM', kitchenCabinetType:'BASE_COOKTOP' });
    expect(form.valid).toBeTrue();
  });
});
