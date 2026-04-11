import { FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import { setControlEnabled } from '../../type-config/preparer/cabinet-preparer.utils';

export class BaseDishwasherCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    v.width = true;
    v.shelfQuantity = false;
    v.drawerQuantity = false;
    v.drawerModel = false;
    v.segments = false;
    v.cornerWidthA = false;
    v.cornerWidthB = false;
    v.cornerMechanism = false;
    v.cornerShelfQuantity = false;
    v.isUpperCorner = false;
    v.bottomWreathOnFloor = false; // brak korpusu → nie dotyczy
    v.enclosureSection = true;

    // Pola specyficzne dla szafki zlewowej — ukryte
    v.sinkFrontType = false;
    v.sinkApron = false;
    v.sinkApronHeight = false;
    v.sinkDrawerModel = false;

    form.patchValue({
      width: 600,
      height: 720, // Korpus 720mm = 820mm całkowita z cokołem 100mm
      depth: 570,
      shelfQuantity: 0,
      drawerQuantity: 0,
      drawerModel: null
    });

    setControlEnabled(form.get('shelfQuantity'), false);
    setControlEnabled(form.get('drawerQuantity'), false);
    setControlEnabled(form.get('drawerModel'), false);
  }
}
