import { FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { setBaseExtraVisibility, setControlEnabled, setStandardDoorVisibility } from '../../type-config/preparer/cabinet-preparer.utils';

export class PantryPassageCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    setStandardDoorVisibility(v);
    setBaseExtraVisibility(v);
    v.pantryPassageFrontType = true;
    v.bottomWreathOnFloor = false;
    v.blockUpperAbove = false;

    // Checkbox is hidden, but the cabinet always blocks uppers above it.
    // We keep the value forced to true so the user cannot disable this invariant from the form.
    form.patchValue({
      width: 900,
      height: 2200,
      depth: 120,
      shelfQuantity: 0,
      drawerQuantity: 0,
      drawerModel: null,
      openingType: 'HANDLE',
      pantryPassageFrontType: 'TWO_DOORS',
      blockUpperAbove: true,
      bottomWreathOnFloor: false
    });

    setControlEnabled(form.get('drawerQuantity'), false);
    setControlEnabled(form.get('drawerModel'), false);
    setControlEnabled(form.get('shelfQuantity'), false);
  }
}
