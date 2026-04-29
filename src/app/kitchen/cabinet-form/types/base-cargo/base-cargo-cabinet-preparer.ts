import { FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { setBaseExtraVisibility, setControlEnabled } from '../../type-config/preparer/cabinet-preparer.utils';

export class BaseCargoCabinetPreparer implements KitchenCabinetPreparer {
  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    v.width = false;
    v.cargoWidthSelect = true;
    v.cargoVariant = true;
    v.cargoBrand = true;
    v.shelfQuantity = false;
    v.drawerQuantity = true;
    v.drawerModel = true;
    v.segments = false;
    v.enclosureSection = true;

    setBaseExtraVisibility(v);
    v.bottomWreathOnFloor = false;

    form.patchValue({
      width: 300,
      height: 720,
      depth: 560,
      shelfQuantity: 0,
      cargoVariant: 'MECHANISM',
      cargoBrand: 'BLUM',
      drawerQuantity: 3,
      drawerModel: null,
      bottomWreathOnFloor: false
    });

    setControlEnabled(form.get('drawerQuantity'), true);
    setControlEnabled(form.get('drawerModel'), true);
    setControlEnabled(form.get('shelfQuantity'), false);
  }
}
