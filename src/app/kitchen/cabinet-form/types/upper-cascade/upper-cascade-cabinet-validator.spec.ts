import { FormBuilder } from '@angular/forms';
import { UpperCascadeCabinetValidator } from './upper-cascade-cabinet-validator';

describe('UpperCascadeCabinetValidator depth order', () => {
  function formFor(lowerDepth: number, upperDepth: number) {
    const form = new FormBuilder().group({ kitchenCabinetType: 'UPPER_CASCADE', width: 600,
      cascadeLowerHeight: 400, cascadeUpperHeight: 320,
      cascadeLowerDepth: lowerDepth, cascadeUpperDepth: upperDepth });
    new UpperCascadeCabinetValidator().validate(form);
    return form;
  }

  it('marks a deeper lower segment invalid even when both depths are individually valid', () => {
    expect(formFor(400, 300).invalid).toBeTrue();
  });

  it('revalidates either depth after editing', () => {
    const form = formFor(300, 400);
    expect(form.valid).toBeTrue();
    form.get('cascadeUpperDepth')?.setValue(300);
    form.get('cascadeLowerDepth')?.setValue(400);
    expect(form.invalid).toBeTrue();
    form.get('cascadeUpperDepth')?.setValue(400);
    expect(form.valid).toBeTrue();
    form.get('cascadeLowerDepth')?.setValue(300);
    expect(form.valid).toBeTrue();
  });

  it('accepts equal depths and stops applying the relation after changing the cabinet type', () => {
    expect(formFor(400, 400).valid).toBeTrue();
    const form = formFor(400, 300);
    form.get('kitchenCabinetType')?.setValue('BASE_ONE_DOOR');
    expect(form.valid).toBeTrue();
  });
});
