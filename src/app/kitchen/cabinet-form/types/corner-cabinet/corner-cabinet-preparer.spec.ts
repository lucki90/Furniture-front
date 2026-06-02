import { FormBuilder } from '@angular/forms';
import { DefaultKitchenFormFactory } from '../../model/default-kitchen-form.factory';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { BLIND_CORNER_CONSTRAINTS, CornerMechanismType } from '../../model/corner-cabinet.model';
import { CornerCabinetPreparer } from './corner-cabinet-preparer';

describe('CornerCabinetPreparer', () => {
  it('keeps the generic width control enabled so other cabinet types can still edit width after switching away from corner', () => {
    const form = DefaultKitchenFormFactory.create(new FormBuilder());
    const visibility = {} as CabinetFormVisibility;

    new CornerCabinetPreparer().prepare(form, visibility);

    expect(form.get('width')?.enabled).toBeTrue();
  });

  it('preserves BLIND_CORNER as an upper (hanging) blind corner with bottom-blind construction and hanging options', () => {
    const form = DefaultKitchenFormFactory.create(new FormBuilder());
    const visibility = {} as CabinetFormVisibility;

    // Simulate the picker: an upper blind corner.
    form.patchValue({ cornerMechanism: CornerMechanismType.BLIND_CORNER, isUpperCorner: true });

    new CornerCabinetPreparer().prepare(form, visibility);

    // BLIND_CORNER stays — upper blind corner is a supported variant (same construction as bottom blind).
    expect(form.get('cornerMechanism')?.value).toBe(CornerMechanismType.BLIND_CORNER);
    expect(form.get('isUpperCorner')?.value).toBeTrue();
    expect(form.get('depth')?.value).toBe(BLIND_CORNER_CONSTRAINTS.depth);
    // Type B layout: single width, hidden widthB, front uchylny visible.
    expect(visibility.cornerWidthB).toBeFalse();
    expect(visibility.cornerFrontUchylnyWidth).toBeTrue();
    // Hanging cabinet options (positioning + extended front) are exposed; no feet/plinth blocking.
    expect(visibility.positioningMode).toBeTrue();
    expect(visibility.gapFromCountertopMm).toBeTrue();
    expect(visibility.extendedFront).toBeTrue();
    expect(visibility.blockUpperAbove).toBeFalse();
  });

  it('coerces Magic/Le Mans to FIXED_SHELVES when switching to an upper corner (only Type A and BLIND_CORNER are upper-eligible)', () => {
    const form = DefaultKitchenFormFactory.create(new FormBuilder());
    const visibility = {} as CabinetFormVisibility;

    // Simulate the picker: a bottom Magic Corner switched to an upper corner.
    form.patchValue({ cornerMechanism: CornerMechanismType.MAGIC_CORNER_COMFORT, isUpperCorner: true });

    new CornerCabinetPreparer().prepare(form, visibility);

    // Magic/Le Mans have no hanging variant → coerced to a valid Type A upper mechanism.
    expect(form.get('cornerMechanism')?.value).toBe(CornerMechanismType.FIXED_SHELVES);
    expect(form.get('isUpperCorner')?.value).toBeTrue();
    expect(form.get('cornerWidthB')?.value).toBe(700);
    expect(visibility.cornerWidthB).toBeTrue();
    expect(visibility.cornerFrontUchylnyWidth).toBeFalse();
  });
});
