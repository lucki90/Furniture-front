import { FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { setStandardDoorVisibility, setUpperExtraVisibility, setControlEnabled } from '../../type-config/preparer/cabinet-preparer.utils';

/**
 * Preparer dla szafki wiszącej z jednymi drzwiami (UPPER_ONE_DOOR).
 * Szafka wisząca: brak cokołu, brak blatu, montowana na szynie.
 */
export class UpperOneDoorCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    setStandardDoorVisibility(v);
    setUpperExtraVisibility(v, /* liftUpVisible */ true);

    form.patchValue({
      width: 400,
      height: 720,
      depth: 320,
      shelfQuantity: 1,
      drawerQuantity: 0,
      drawerModel: null,
      positioningMode: 'RELATIVE_TO_CEILING',
      gapFromCountertopMm: 500,
      isLiftUp: false,
      isFrontExtended: false
    });

    setControlEnabled(form.get('drawerQuantity'), false);
    setControlEnabled(form.get('shelfQuantity'), true);
    setControlEnabled(form.get('drawerModel'), false);
  }
}
