import { FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from "../../type-config/preparer/kitchen-cabinet-preparer";
import { CabinetFormVisibility } from "../../type-config/preparer/cabinet-form-visibility";
import { setControlEnabled } from '../../type-config/preparer/cabinet-preparer.utils';

export class BaseWithDrawersCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // widoczność - szuflady widoczne, półki ukryte
    v.width = true;  // Standardowa szerokość widoczna
    v.shelfQuantity = false;
    v.drawerQuantity = true;
    v.drawerModel = true;
    v.segments = false;

    // Ukryj pola narożnika (resetowanie po CORNER_CABINET)
    v.cornerWidthA = false;
    v.cornerWidthB = false;
    v.cornerMechanism = false;
    v.cornerShelfQuantity = false;
    v.isUpperCorner = false;

    // Pokaż sekcję obudowy bocznej
    v.enclosureSection = true;

    // Pokaż opcję dolnego wieńca na podłodze
    v.bottomWreathOnFloor = true;
    v.blockUpperAbove = true;

    // wartości domyślne dla szafki z szufladami
    form.patchValue({
      width: 450,
      height: 720, // Wysokość korpusu (bez cokołu i blatu)
      depth: 500,
      shelfQuantity: 0,
      drawerQuantity: 3,
      drawerModel: 'ANTARO_TANDEMBOX'
    });

    // możliwość edycji
    setControlEnabled(form.get('drawerQuantity'), v.drawerQuantity);
    setControlEnabled(form.get('shelfQuantity'), v.shelfQuantity);
    setControlEnabled(form.get('drawerModel'), v.drawerModel);
  }
}
