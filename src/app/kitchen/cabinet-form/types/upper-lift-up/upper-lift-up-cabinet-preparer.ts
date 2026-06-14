import { FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { setStandardDoorVisibility, setUpperExtraVisibility, setControlEnabled } from '../../type-config/preparer/cabinet-preparer.utils';
import { ProjectSettingsConstraints, DEFAULT_LIFT_MECHANISM_TYPE, supportsThirdLiftMechanism, supportsHfAsymmetricFront } from '../../model/kitchen-cabinet-constants';

/**
 * Preparer dla osobnego typu szafki wiszącej z klapą unoszoną do góry (UPPER_LIFT_UP).
 * V1 używa obecnej logiki gas-lift / UPWARDS, ale bez checkboxa lift-up w formularzu.
 */
export class UpperLiftUpCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    setStandardDoorVisibility(v);
    setUpperExtraVisibility(v, /* liftUpVisible */ false);
    // V2A: szafka otwierana do góry ma wybór mechanizmu podnośnika (zamiast checkboxa lift-up)
    v.liftMechanismType = true;
    // Aventos: opcja trzeciego mechanizmu dotyczy WYŁĄCZNIE HK-S / HF top (parytet z katalogiem BE).
    // Domyślny mechanizm to GAS_GTV → checkbox ukryty; widoczność odświeża się reaktywnie przy zmianie mechanizmu
    // w cabinet-form (refreshLiftThirdMechanismVisibility).
    v.allowThirdLiftMechanism = supportsThirdLiftMechanism(DEFAULT_LIFT_MECHANISM_TYPE);
    // Fronty asymetryczne HF (TKH, doc §10.4) dotyczą wyłącznie AVENTOS_HF_TOP — domyślnie ukryte,
    // widoczność odświeża się reaktywnie przy zmianie mechanizmu (refreshLiftMechanismDependentVisibility).
    v.hfUpperFrontHeightMm = supportsHfAsymmetricFront(DEFAULT_LIFT_MECHANISM_TYPE);

    form.patchValue({
      width: 600,
      height: 400,
      depth: 340,
      shelfQuantity: 1,
      drawerQuantity: 0,
      drawerModel: null,
      positioningMode: 'RELATIVE_TO_CEILING',
      gapFromCountertopMm: ProjectSettingsConstraints.UPPER_GAP_FROM_COUNTERTOP_DEFAULT,
      isLiftUp: true,
      isFrontExtended: false,
      liftMechanismType: DEFAULT_LIFT_MECHANISM_TYPE,
      allowThirdLiftMechanism: false,
      hfUpperFrontHeightMm: null
    });

    setControlEnabled(form.get('drawerQuantity'), false);
    setControlEnabled(form.get('shelfQuantity'), true);
    setControlEnabled(form.get('drawerModel'), false);
  }
}
