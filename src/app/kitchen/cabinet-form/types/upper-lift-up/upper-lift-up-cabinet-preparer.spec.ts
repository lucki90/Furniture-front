import { FormBuilder, FormGroup } from '@angular/forms';
import { UpperLiftUpCabinetPreparer } from './upper-lift-up-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';

describe('UpperLiftUpCabinetPreparer', () => {
  let form: FormGroup;
  let visibility: CabinetFormVisibility;
  const preparer = new UpperLiftUpCabinetPreparer();

  beforeEach(() => {
    const fb = new FormBuilder();
    form = fb.group({
      width: [0],
      height: [0],
      depth: [0],
      shelfQuantity: [0],
      drawerQuantity: [0],
      drawerModel: ['ANY'],
      positioningMode: ['RELATIVE_TO_COUNTERTOP'],
      gapFromCountertopMm: [0],
      isLiftUp: [false],
      isFrontExtended: [true],
      liftMechanismType: ['AVENTOS_HK_TOP'],
      allowThirdLiftMechanism: [true],
      hfUpperFrontHeightMm: [350]
    });
    visibility = {} as CabinetFormVisibility;
    preparer.prepare(form, visibility);
  });

  it('exposes the lift mechanism selector and hides the lift-up checkbox', () => {
    expect(visibility.liftMechanismType).toBeTrue();
    expect(visibility.liftUp).toBeFalse();
  });

  it('hides the third-mechanism opt-in for the default GAS_GTV mechanism and defaults it to false (off)', () => {
    // [P3] Opcja trzeciego mechanizmu Aventos dotyczy wyłącznie HK-S / HF top — dla domyślnego GAS_GTV checkbox
    // jest ukryty; widoczność odświeża się reaktywnie przy zmianie mechanizmu (refreshLiftMechanismDependentVisibility).
    expect(visibility.allowThirdLiftMechanism).toBeFalse();
    expect(form.get('allowThirdLiftMechanism')?.value).toBeFalse();
  });

  it('hides the HF asymmetric front field for the default GAS_GTV mechanism and resets it to null (symmetric)', () => {
    // Fronty asymetryczne HF (TKH) dotyczą wyłącznie AVENTOS_HF_TOP — dla domyślnego GAS_GTV pole jest ukryte,
    // a wartość wyzerowana; widoczność odświeża się reaktywnie (refreshLiftMechanismDependentVisibility).
    expect(visibility.hfUpperFrontHeightMm).toBeFalse();
    expect(form.get('hfUpperFrontHeightMm')?.value).toBeNull();
  });

  it('defaults the lift mechanism to GAS_GTV', () => {
    expect(form.get('liftMechanismType')?.value).toBe('GAS_GTV');
  });

  it('forces the upward flap configuration', () => {
    expect(form.get('isLiftUp')?.value).toBeTrue();
    expect(form.get('isFrontExtended')?.value).toBeFalse();
    expect(form.get('positioningMode')?.value).toBe('RELATIVE_TO_CEILING');
  });
});
