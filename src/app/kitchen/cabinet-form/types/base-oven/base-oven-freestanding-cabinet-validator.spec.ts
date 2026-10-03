import { TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CabinetFormTypeLifecycleService } from '../../cabinet-form-type-lifecycle.service';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';

describe('BaseOvenFreestandingCabinetValidator', () => {
  let form: FormGroup;
  let lifecycle: CabinetFormTypeLifecycleService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [FormBuilder, CabinetFormTypeLifecycleService] });
    form = DefaultKitchenFormFactory.create(TestBed.inject(FormBuilder));
    lifecycle = TestBed.inject(CabinetFormTypeLifecycleService);
    changeType(KitchenCabinetType.BASE_OVEN_FREESTANDING);
  });

  function changeType(type: KitchenCabinetType) {
    form.get('kitchenCabinetType')?.setValue(type);
    lifecycle.applyTypeChange(form, type, null);
  }

  for (const [field, min, max] of [['width', 200, 1200], ['height', 300, 2000], ['depth', 200, 1000]] as const) {
    it(`validates edited ${field} against its own inclusive bounds and required value`, () => {
      const control = form.get(field)!;
      for (const value of [min, max]) {
        control.setValue(value);
        expect(form.valid).withContext(String(value)).toBeTrue();
      }
      for (const value of [min - 1, max + 1, null]) {
        control.setValue(value);
        expect(form.invalid).withContext(String(value)).toBeTrue();
      }
      expect(control.hasError('required')).toBeTrue();
      control.setValue(min);
      expect(form.valid).toBeTrue();
    });
  }

  it('replaces standard base constraints and restores them when switching back', () => {
    changeType(KitchenCabinetType.BASE_ONE_DOOR);
    changeType(KitchenCabinetType.BASE_OVEN_FREESTANDING);
    form.patchValue({ width: 1000, height: 1500, depth: 900 });
    expect(form.valid).toBeTrue();
    changeType(KitchenCabinetType.BASE_ONE_DOOR);
    expect(form.valid).toBeTrue();
    form.get('width')?.setValue(1000);
    expect(form.get('width')?.hasError('max')).toBeTrue();
  });

  it('does not inherit the drainer fixed widths and restores them when switching back', () => {
    changeType(KitchenCabinetType.UPPER_DRAINER);
    changeType(KitchenCabinetType.BASE_OVEN_FREESTANDING);
    form.get('width')?.setValue(700);
    expect(form.valid).toBeTrue();
    changeType(KitchenCabinetType.UPPER_DRAINER);
    form.get('width')?.setValue(700);
    expect(form.get('width')?.hasError('fixedSizes')).toBeTrue();
  });

  it('rejects invalid saved dimensions after editing restoration', () => {
    lifecycle.applyTypeChange(form, KitchenCabinetType.BASE_OVEN_FREESTANDING, {
      id: 'oven', type: KitchenCabinetType.BASE_OVEN_FREESTANDING, openingType: 'HANDLE',
      width: 1, height: 720, depth: 560, positionY: 0, shelfQuantity: 0
    });
    expect(form.get('width')?.invalid).toBeTrue();
    expect(form.invalid).toBeTrue();
  });
});
