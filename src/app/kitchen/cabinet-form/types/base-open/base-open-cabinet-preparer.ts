import { FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { setBaseExtraVisibility, setControlEnabled, setStandardDoorVisibility } from '../../type-config/preparer/cabinet-preparer.utils';

export class BaseOpenCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    setStandardDoorVisibility(v);
    setBaseExtraVisibility(v);
    v.openingType = false;

    form.patchValue({
      width: 400,
      height: 720,
      depth: 500,
      shelfQuantity: 2,
      drawerQuantity: 0,
      drawerModel: null,
      openingType: 'NONE'
    });

    setControlEnabled(form.get('drawerQuantity'), false);
    setControlEnabled(form.get('shelfQuantity'), true);
    setControlEnabled(form.get('drawerModel'), false);
  }
}
