import { FormBuilder, FormGroup } from '@angular/forms';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { CornerHandleType, CornerMechanismType } from '../../model/corner-cabinet.model';
import { CornerCabinetValidator } from './corner-cabinet-validator';

describe('CornerCabinetValidator', () => {
  let form: FormGroup;
  let validator: CornerCabinetValidator;

  beforeEach(() => {
    const fb = new FormBuilder();
    form = DefaultKitchenFormFactory.create(fb);
    validator = new CornerCabinetValidator();

    form.patchValue({
      cornerMechanism: CornerMechanismType.BLIND_CORNER,
      cornerWidthA: 1000,
      height: 720,
      depth: 510,
      cornerFrontUchylnyWidthMm: 500
    });
  });

  it('requires blind-panel visible width when split is enabled', () => {
    form.patchValue({
      blindPanelSplitEnabled: true,
      blindPanelVisibleWidthMm: 49
    });

    validator.validate(form);

    expect(form.get('blindPanelVisibleWidthMm')?.hasError('min')).toBeTrue();
    expect(validator.getDimensionErrors(form)).toContain(
      'Szerokość widocznej części frontu ślepego musi być między 50 a 600mm'
    );
  });

  it('ignores blind-panel visible width when split is disabled', () => {
    form.patchValue({
      blindPanelSplitEnabled: false,
      blindPanelVisibleWidthMm: 49
    });

    validator.validate(form);

    expect(form.get('blindPanelVisibleWidthMm')?.errors).toBeNull();
  });

  it('allows 15 mm visible blind panel for MILLED handle', () => {
    form.patchValue({
      blindPanelSplitEnabled: true,
      cornerHandleType: CornerHandleType.MILLED,
      blindPanelVisibleWidthMm: 15
    });

    validator.validate(form);

    expect(form.get('blindPanelVisibleWidthMm')?.errors).toBeNull();
  });

  it('allows 50 mm visible blind panel for SCREWED handle', () => {
    form.patchValue({
      blindPanelSplitEnabled: true,
      cornerHandleType: CornerHandleType.SCREWED,
      blindPanelVisibleWidthMm: 50
    });

    validator.validate(form);

    expect(form.get('blindPanelVisibleWidthMm')?.errors).toBeNull();
  });

  it('allows 0 mm visible blind panel for PUSH_TO_OPEN handle', () => {
    form.patchValue({
      blindPanelSplitEnabled: true,
      cornerHandleType: CornerHandleType.PUSH_TO_OPEN,
      blindPanelVisibleWidthMm: 0
    });

    validator.validate(form);

    expect(form.get('blindPanelVisibleWidthMm')?.errors).toBeNull();
  });

  it('uses handle-specific minimum in dimension errors', () => {
    form.patchValue({
      blindPanelSplitEnabled: true,
      cornerHandleType: CornerHandleType.MILLED,
      blindPanelVisibleWidthMm: 14
    });

    validator.validate(form);

    expect(validator.getDimensionErrors(form)).toContain(
      'Szerokość widocznej części frontu ślepego musi być między 15 a 600mm'
    );
  });

  it('uses 50 mm minimum in dimension errors for SCREWED handle', () => {
    form.patchValue({
      blindPanelSplitEnabled: true,
      cornerHandleType: CornerHandleType.SCREWED,
      blindPanelVisibleWidthMm: 49
    });

    validator.validate(form);

    expect(form.get('blindPanelVisibleWidthMm')?.hasError('min')).toBeTrue();
  });
});
