import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { CornerHandleType, CornerMechanismType, CornerSystemLine } from '../../model/corner-cabinet.model';
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

  // ==================== Per-system front-min (CR-fix Faza 1) ====================

  it('allows Magic Standard front below 400 mm (system min 396, no line)', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.MAGIC_CORNER_STANDARD,
      cornerSystemLine: null,
      cornerFrontUchylnyWidthMm: 396
    });

    validator.validate(form);

    expect(form.get('cornerFrontUchylnyWidthMm')?.errors).toBeNull();
    expect(validator.getDimensionErrors(form)).not.toContain(
      'Szerokość frontu uchylnego musi być między 396 a 600mm'
    );
  });

  it('blocks Magic Comfort front below 446 mm (system min 446, no line)', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.MAGIC_CORNER_COMFORT,
      cornerSystemLine: null,
      cornerFrontUchylnyWidthMm: 445
    });

    validator.validate(form);

    expect(form.get('cornerFrontUchylnyWidthMm')?.hasError('min')).toBeTrue();
    expect(validator.getDimensionErrors(form)).toContain(
      'Szerokość frontu uchylnego musi być między 446 a 600mm'
    );
  });

  it('uses the selected line Y-min for Magic Corner (LINE_500 -> 496)', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.MAGIC_CORNER_STANDARD,
      cornerSystemLine: CornerSystemLine.LINE_500,
      cornerFrontUchylnyWidthMm: 495
    });

    validator.validate(form);

    expect(form.get('cornerFrontUchylnyWidthMm')?.hasError('min')).toBeTrue();
    expect(validator.getDimensionErrors(form)).toContain(
      'Szerokość frontu uchylnego musi być między 496 a 600mm'
    );
  });

  it('keeps 400 mm minimum for Le Mans', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.LE_MANS_I,
      cornerFrontUchylnyWidthMm: 399
    });

    validator.validate(form);

    expect(form.get('cornerFrontUchylnyWidthMm')?.hasError('min')).toBeTrue();
    expect(validator.getDimensionErrors(form)).toContain(
      'Szerokość frontu uchylnego musi być między 400 a 600mm'
    );
  });

  // ==================== Per-system opening angle (CR-fix Faza 1) ====================

  it('blocks Le Mans opening angle below 85 degrees', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.LE_MANS_II,
      cornerFrontUchylnyWidthMm: 500,
      cornerOpeningAngleDeg: 80
    });

    validator.validate(form);

    expect(form.get('cornerOpeningAngleDeg')?.hasError('min')).toBeTrue();
    expect(validator.getDimensionErrors(form)).toContain(
      'Le Mans wymaga kąta otwarcia ≥ 85° (podano 80°)'
    );
  });

  it('blocks Magic Comfort opening angle above 90 degrees', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.MAGIC_CORNER_COMFORT,
      cornerSystemLine: CornerSystemLine.LINE_450,
      cornerFrontUchylnyWidthMm: 500,
      cornerOpeningAngleDeg: 95
    });

    validator.validate(form);

    expect(form.get('cornerOpeningAngleDeg')?.hasError('max')).toBeTrue();
    expect(validator.getDimensionErrors(form)).toContain(
      'Magic Corner Comfort dopuszcza maks. 90° otwarcia (podano 95°)'
    );
  });

  it('blocks Magic Standard opening angle above 75 degrees', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.MAGIC_CORNER_STANDARD,
      cornerFrontUchylnyWidthMm: 500,
      cornerOpeningAngleDeg: 80
    });

    validator.validate(form);

    expect(form.get('cornerOpeningAngleDeg')?.hasError('max')).toBeTrue();
  });

  it('accepts empty opening angle (validated only when provided)', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.LE_MANS_I,
      cornerFrontUchylnyWidthMm: 500,
      cornerOpeningAngleDeg: null
    });

    validator.validate(form);

    expect(form.get('cornerOpeningAngleDeg')?.errors).toBeNull();
  });

  it('reports Magic Comfort LINE_400 as a dimension error', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.MAGIC_CORNER_COMFORT,
      cornerSystemLine: CornerSystemLine.LINE_400,
      cornerFrontUchylnyWidthMm: 500
    });

    validator.validate(form);

    expect(validator.getDimensionErrors(form)).toContain(
      'Magic Corner Comfort nie obsługuje linii 400 — wybierz linię 450 lub wyższą.'
    );
  });

  // ==================== Stale `width` validators cleared (disabled-button fix) ====================

  it('clears stale `width` validators so a valid Type B corner is form-valid', () => {
    // Symuluj przejście z BASE_ONE_DOOR (width max=600) na narożnik: width zostaje
    // ustawione na 900 ze stałym walidatorem max=600 z poprzedniego typu.
    const width = form.get('width');
    width?.setValidators([Validators.required, Validators.min(300), Validators.max(600)]);
    width?.setValue(900);
    width?.updateValueAndValidity();
    expect(width?.invalid).toBeTrue();

    validator.validate(form);

    expect(width?.errors).toBeNull();
    expect(width?.valid).toBeTrue();
    expect(form.valid).toBeTrue();
  });

  it('clears stale `width` validators for Type A corner as well', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.FIXED_SHELVES,
      cornerWidthA: 900,
      cornerWidthB: 900,
      cornerShelfQuantity: 2,
      height: 720,
      depth: 510
    });
    const width = form.get('width');
    width?.setValidators([Validators.required, Validators.max(600)]);
    width?.setValue(900);
    width?.updateValueAndValidity();
    expect(width?.invalid).toBeTrue();

    validator.validate(form);

    expect(width?.errors).toBeNull();
    expect(form.valid).toBeTrue();
  });
});
