import { FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { setStandardDoorVisibility, setUpperExtraVisibility, setControlEnabled } from '../../type-config/preparer/cabinet-preparer.utils';
import { ProjectSettingsConstraints } from '../../model/kitchen-cabinet-constants';

/**
 * Preparer dla osobnego typu szafki wiszacej z klapa unoszona do gory (UPPER_LIFT_UP).
 * V1 uzywa obecnej logiki gas-lift / UPWARDS, ale bez checkboxa lift-up w formularzu.
 */
export class UpperLiftUpCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    setStandardDoorVisibility(v);
    setUpperExtraVisibility(v, /* liftUpVisible */ false);

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
      isFrontExtended: false
    });

    setControlEnabled(form.get('drawerQuantity'), false);
    setControlEnabled(form.get('shelfQuantity'), true);
    setControlEnabled(form.get('drawerModel'), false);
  }
}
