import { FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { setStandardDoorVisibility, setUpperExtraVisibility, setControlEnabled } from '../../type-config/preparer/cabinet-preparer.utils';
import { ProjectSettingsConstraints } from '../../model/kitchen-cabinet-constants';

/**
 * Preparer dla szafki wiszącej z dwojgiem drzwi (UPPER_TWO_DOOR).
 * Szafka wisząca: brak cokołu, brak blatu, montowana na szynie.
 */
export class UpperTwoDoorCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    setStandardDoorVisibility(v);
    setUpperExtraVisibility(v, /* liftUpVisible */ false);

    form.patchValue({
      width: 600,
      height: 720,
      depth: 320,
      shelfQuantity: 1,
      drawerQuantity: 0,
      drawerModel: null,
      positioningMode: 'RELATIVE_TO_CEILING',
      gapFromCountertopMm: ProjectSettingsConstraints.UPPER_GAP_FROM_COUNTERTOP_DEFAULT,
      isFrontExtended: false
    });

    setControlEnabled(form.get('drawerQuantity'), false);
    setControlEnabled(form.get('shelfQuantity'), true);
    setControlEnabled(form.get('drawerModel'), false);
  }
}
