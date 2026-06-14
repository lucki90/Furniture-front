import { FormControl, FormGroup } from '@angular/forms';
import { hfUpperFrontHeightValidator } from './upper-lift-up.validators';

function buildGroup(hfValue: number | null, height: number | null): FormGroup {
  const group = new FormGroup({
    height: new FormControl(height),
    hfUpperFrontHeightMm: new FormControl(hfValue, hfUpperFrontHeightValidator)
  });
  // Walidator zależy od rodzeństwa (height); rodzic jest dostępny dopiero po zbudowaniu grupy,
  // więc rewalidujemy — tak jak komponent po zmianie wysokości szafki.
  group.get('hfUpperFrontHeightMm')?.updateValueAndValidity();
  return group;
}

describe('hfUpperFrontHeightValidator', () => {
  it('treats null/empty as valid (front symetryczny)', () => {
    expect(hfUpperFrontHeightValidator(new FormControl(null))).toBeNull();
    expect(hfUpperFrontHeightValidator(new FormControl(''))).toBeNull();
    expect(hfUpperFrontHeightValidator(new FormControl(undefined))).toBeNull();
  });

  it('rejects zero with a message error', () => {
    const group = buildGroup(0, 700);
    expect(group.get('hfUpperFrontHeightMm')?.errors?.['message']).toContain('większa od 0');
  });

  it('rejects negative values', () => {
    const group = buildGroup(-50, 700);
    expect(group.get('hfUpperFrontHeightMm')?.errors?.['message']).toContain('większa od 0');
  });

  it('rejects value greater or equal to cabinet height', () => {
    const group = buildGroup(700, 700);
    expect(group.get('hfUpperFrontHeightMm')?.errors?.['message']).toContain('mniejsza od wysokości');
  });

  it('accepts a positive value below cabinet height', () => {
    const group = buildGroup(550, 700);
    expect(group.get('hfUpperFrontHeightMm')?.errors).toBeNull();
  });

  it('accepts any positive value when cabinet height is unknown', () => {
    const group = buildGroup(550, null);
    expect(group.get('hfUpperFrontHeightMm')?.errors).toBeNull();
  });
});
