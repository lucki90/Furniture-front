import { TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CabinetFormTypeLifecycleService } from '../../cabinet-form-type-lifecycle.service';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';

describe('UpperDrainerCabinetValidator', () => {
  let form: FormGroup;
  let lifecycle: CabinetFormTypeLifecycleService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [FormBuilder, CabinetFormTypeLifecycleService] });
    lifecycle = TestBed.inject(CabinetFormTypeLifecycleService);
    form = DefaultKitchenFormFactory.create(TestBed.inject(FormBuilder));
    form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_DRAINER);
    lifecycle.applyTypeChange(form, KitchenCabinetType.UPPER_DRAINER, null);
  });

  it('rejects a persisted width of 700 after real editing restoration until a valid width is selected', () => {
    lifecycle.applyTypeChange(form, KitchenCabinetType.UPPER_DRAINER, {
      id: 'drainer', type: KitchenCabinetType.UPPER_DRAINER, openingType: 'HANDLE',
      width: 700, height: 600, depth: 300, positionY: 1400, shelfQuantity: 0, drainerFrontType: 'OPEN'
    });

    expect(form.get('width')?.hasError('fixedSizes')).toBeTrue();
    expect(form.invalid).toBeTrue();
    form.get('width')?.setValue(600);
    expect(form.get('width')?.errors).toBeNull();
    expect(form.valid).toBeTrue();
  });

  it('retains fixed-width validation after edits, silent patches and repeated validation', () => {
    for (const width of [700, 650, 600.5, 1000]) {
      form.patchValue({ width }, { emitEvent: false });
      form.get('width')?.updateValueAndValidity({ emitEvent: false });
      expect(form.get('width')?.hasError('fixedSizes')).withContext(String(width)).toBeTrue();
      expect(form.invalid).toBeTrue();
    }
  });

  it('accepts every supported width and keeps width required', () => {
    for (const width of [400, 500, 600, 800, 900]) {
      form.get('width')?.setValue(width);
      expect(form.valid).withContext(String(width)).toBeTrue();
    }
    form.get('width')?.setValue(null);
    expect(form.get('width')?.hasError('required')).toBeTrue();
    expect(form.invalid).toBeTrue();
  });

  it('replaces standard upper constraints and removes the drainer constraint when switching back', () => {
    form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_TWO_DOOR);
    lifecycle.applyTypeChange(form, KitchenCabinetType.UPPER_TWO_DOOR, null);
    form.get('width')?.setValue(700);
    expect(form.valid).toBeTrue();

    form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_DRAINER);
    lifecycle.applyTypeChange(form, KitchenCabinetType.UPPER_DRAINER, null);
    form.get('width')?.setValue(700);
    expect(form.invalid).toBeTrue();

    form.get('kitchenCabinetType')?.setValue(KitchenCabinetType.UPPER_TWO_DOOR);
    lifecycle.applyTypeChange(form, KitchenCabinetType.UPPER_TWO_DOOR, null);
    form.get('width')?.setValue(700);
    expect(form.get('width')?.hasError('fixedSizes')).toBeFalse();
    expect(form.valid).toBeTrue();
    form.get('width')?.setValue(50);
    expect(form.get('width')?.hasError('min')).toBeTrue();
  });
});
