import { FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { setStandardDoorVisibility, setBaseExtraVisibility, setControlEnabled } from '../../type-config/preparer/cabinet-preparer.utils';

export class BaseOneDoorCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    setStandardDoorVisibility(v);
    setBaseExtraVisibility(v);

    form.patchValue({
      width: 400,
      height: 720,
      depth: 500,
      drawerModel: null,
      drawerQuantity: 0,
      shelfQuantity: 1
    });

    setControlEnabled(form.get('drawerQuantity'), v.drawerQuantity);
    setControlEnabled(form.get('shelfQuantity'), v.shelfQuantity);
    setControlEnabled(form.get('drawerModel'), v.drawerModel);
  }
}
