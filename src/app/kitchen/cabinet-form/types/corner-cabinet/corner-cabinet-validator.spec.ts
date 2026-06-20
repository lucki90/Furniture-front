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

  // ==================== Blenda narożna (decyzja 8) ====================
  // Próg widocznej części frontu ślepego = max(uchwyt, grubość frontu ≥18mm) — książka Wasiak v.2.3.
  // Bez uchwytu wystającego (MILLED/PUSH_TO_OPEN) → grubość frontu 18mm; z uchwytem (SCREWED) → 50mm.

  it('allows 18 mm visible blind panel for MILLED handle (front-thickness floor)', () => {
    form.patchValue({
      blindPanelSplitEnabled: true,
      cornerHandleType: CornerHandleType.MILLED,
      blindPanelVisibleWidthMm: 18
    });

    validator.validate(form);

    expect(form.get('blindPanelVisibleWidthMm')?.errors).toBeNull();
  });

  it('rejects 17 mm visible blind panel for MILLED handle (below 18mm front floor)', () => {
    form.patchValue({
      blindPanelSplitEnabled: true,
      cornerHandleType: CornerHandleType.MILLED,
      blindPanelVisibleWidthMm: 17
    });

    validator.validate(form);

    expect(form.get('blindPanelVisibleWidthMm')?.hasError('min')).toBeTrue();
    expect(validator.getDimensionErrors(form)).toContain(
      'Szerokość widocznej części frontu ślepego musi być między 18 a 600mm'
    );
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

  it('allows 18 mm visible blind panel for PUSH_TO_OPEN handle (front-thickness floor)', () => {
    form.patchValue({
      blindPanelSplitEnabled: true,
      cornerHandleType: CornerHandleType.PUSH_TO_OPEN,
      blindPanelVisibleWidthMm: 18
    });

    validator.validate(form);

    expect(form.get('blindPanelVisibleWidthMm')?.errors).toBeNull();
  });

  it('rejects 17 mm visible blind panel for PUSH_TO_OPEN handle (below 18mm front floor)', () => {
    form.patchValue({
      blindPanelSplitEnabled: true,
      cornerHandleType: CornerHandleType.PUSH_TO_OPEN,
      blindPanelVisibleWidthMm: 17
    });

    validator.validate(form);

    expect(form.get('blindPanelVisibleWidthMm')?.hasError('min')).toBeTrue();
  });

  it('uses configured front thickness as floor when greater than handle filler', () => {
    form.patchValue({
      blindPanelSplitEnabled: true,
      cornerHandleType: CornerHandleType.MILLED,
      cornerFrontThicknessMm: 20,
      blindPanelVisibleWidthMm: 19
    });

    validator.validate(form);

    expect(form.get('blindPanelVisibleWidthMm')?.hasError('min')).toBeTrue();
    expect(validator.getDimensionErrors(form)).toContain(
      'Szerokość widocznej części frontu ślepego musi być między 20 a 600mm'
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

  // ==================== Per-system front thickness (CR-fix P2) ====================

  it('blocks Le Mans front thickness below 16 mm', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.LE_MANS_I,
      cornerFrontUchylnyWidthMm: 500,
      cornerFrontThicknessMm: 15
    });

    validator.validate(form);

    expect(form.get('cornerFrontThicknessMm')?.hasError('min')).toBeTrue();
  });

  it('blocks Le Mans front thickness above 19 mm', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.LE_MANS_II,
      cornerFrontUchylnyWidthMm: 500,
      cornerFrontThicknessMm: 22
    });

    validator.validate(form);

    expect(form.get('cornerFrontThicknessMm')?.hasError('max')).toBeTrue();
  });

  it('accepts Le Mans front thickness within 16-19 mm', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.LE_MANS_I,
      cornerFrontUchylnyWidthMm: 500,
      cornerFrontThicknessMm: 18
    });

    validator.validate(form);

    expect(form.get('cornerFrontThicknessMm')?.errors).toBeNull();
  });

  it('accepts empty Le Mans front thickness (validated only when provided)', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.LE_MANS_I,
      cornerFrontUchylnyWidthMm: 500,
      cornerFrontThicknessMm: null
    });

    validator.validate(form);

    expect(form.get('cornerFrontThicknessMm')?.errors).toBeNull();
  });

  it('does not constrain front thickness for non-Le-Mans mechanisms', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.MAGIC_CORNER_STANDARD,
      cornerFrontUchylnyWidthMm: 500,
      cornerFrontThicknessMm: 25
    });

    validator.validate(form);

    expect(form.get('cornerFrontThicknessMm')?.errors).toBeNull();
  });

  // ==================== System line inline error (CR-fix P2) ====================

  it('flags Magic Comfort LINE_400 as an inline control error on cornerSystemLine', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.MAGIC_CORNER_COMFORT,
      cornerSystemLine: CornerSystemLine.LINE_400,
      cornerFrontUchylnyWidthMm: 500
    });

    validator.validate(form);

    expect(form.get('cornerSystemLine')?.errors?.['cabinetValidation']).toEqual({
      code: 'MAGIC_COMFORT_LINE_400_UNSUPPORTED',
    });
  });

  it('does not flag Magic Comfort with an allowed line (LINE_450)', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.MAGIC_CORNER_COMFORT,
      cornerSystemLine: CornerSystemLine.LINE_450,
      cornerFrontUchylnyWidthMm: 500
    });

    validator.validate(form);

    expect(form.get('cornerSystemLine')?.errors).toBeNull();
  });

  it('does not constrain the system line for Le Mans (LINE_400 allowed as metadata)', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.LE_MANS_I,
      cornerSystemLine: CornerSystemLine.LINE_400,
      cornerFrontUchylnyWidthMm: 500
    });

    validator.validate(form);

    expect(form.get('cornerSystemLine')?.errors).toBeNull();
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

  // ==================== Upper (hanging) blind corner mechanism eligibility ====================

  it('accepts BLIND_CORNER as an upper (hanging) corner mechanism', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.BLIND_CORNER,
      isUpperCorner: true,
      cornerWidthA: 1000,
      height: 720,
      depth: 510,
      cornerFrontUchylnyWidthMm: 500
    });

    expect(validator.isMechanismValid(form)).toBeTrue();
    expect(validator.getMechanismError(form)).toBeNull();
  });

  it('rejects Magic Corner as an upper corner mechanism (bottom-only)', () => {
    form.patchValue({
      cornerMechanism: CornerMechanismType.MAGIC_CORNER_COMFORT,
      isUpperCorner: true,
      cornerWidthA: 1000,
      height: 720,
      depth: 510,
      cornerFrontUchylnyWidthMm: 500
    });

    expect(validator.isMechanismValid(form)).toBeFalse();
    expect(validator.getMechanismError(form)).not.toBeNull();
  });

  // ==================== Upper (hanging) blind corner — book dimensions (decyzja 1-4) ====================
  // Wiszący ślepy narożnik: szerokość 660–960, wysokość 300–1200, półki 0–4, front uchylny min 296mm.

  function patchUpperBlind(overrides: Record<string, unknown>): void {
    form.patchValue({
      cornerMechanism: CornerMechanismType.BLIND_CORNER,
      isUpperCorner: true,
      cornerWidthA: 800,
      height: 720,
      cornerShelfQuantity: 2,
      cornerFrontUchylnyWidthMm: 500,
      ...overrides
    });
  }

  it('accepts upper-blind width 660 and 960', () => {
    patchUpperBlind({ cornerWidthA: 660 });
    validator.validate(form);
    expect(form.get('cornerWidthA')?.errors).toBeNull();

    patchUpperBlind({ cornerWidthA: 960 });
    validator.validate(form);
    expect(form.get('cornerWidthA')?.errors).toBeNull();
  });

  it('rejects upper-blind width below 660 or above 960', () => {
    patchUpperBlind({ cornerWidthA: 659 });
    validator.validate(form);
    expect(form.get('cornerWidthA')?.invalid).toBeTrue();

    patchUpperBlind({ cornerWidthA: 961 });
    validator.validate(form);
    expect(form.get('cornerWidthA')?.invalid).toBeTrue();
  });

  it('accepts upper-blind height 300 and 1200', () => {
    patchUpperBlind({ height: 300 });
    validator.validate(form);
    expect(form.get('height')?.errors).toBeNull();

    patchUpperBlind({ height: 1200 });
    validator.validate(form);
    expect(form.get('height')?.errors).toBeNull();
  });

  it('rejects upper-blind height below 300 or above 1200', () => {
    patchUpperBlind({ height: 299 });
    validator.validate(form);
    expect(form.get('height')?.invalid).toBeTrue();

    patchUpperBlind({ height: 1201 });
    validator.validate(form);
    expect(form.get('height')?.invalid).toBeTrue();
  });

  it('accepts upper-blind shelf quantity 0 through 4', () => {
    [0, 4].forEach(qty => {
      patchUpperBlind({ cornerShelfQuantity: qty });
      validator.validate(form);
      expect(form.get('cornerShelfQuantity')?.errors).toBeNull();
    });
  });

  it('rejects upper-blind shelf quantity above 4', () => {
    patchUpperBlind({ cornerShelfQuantity: 5 });
    validator.validate(form);
    expect(form.get('cornerShelfQuantity')?.invalid).toBeTrue();
  });

  it('accepts upper-blind front uchylny min 296', () => {
    patchUpperBlind({ cornerFrontUchylnyWidthMm: 296 });
    validator.validate(form);
    expect(form.get('cornerFrontUchylnyWidthMm')?.errors).toBeNull();
  });

  it('rejects upper-blind front uchylny below 296', () => {
    patchUpperBlind({ cornerFrontUchylnyWidthMm: 295 });
    validator.validate(form);
    expect(form.get('cornerFrontUchylnyWidthMm')?.invalid).toBeTrue();
  });
});
