import {AbstractControl, FormGroup} from '@angular/forms';
import {KitchenCabinetPreparer} from "../../type-config/preparer/kitchen-cabinet-preparer";
import {CabinetFormVisibility} from "../../type-config/preparer/cabinet-form-visibility";

export class BaseOneDoorCabinetPreparer
  implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {

    // widoczność
    v.width = true;  // Standardowa szerokość widoczna
    v.shelfQuantity = true;
    v.drawerQuantity = false;
    v.drawerModel = false;
    v.segments = false;

    // Ukryj pola narożnika (resetowanie po CORNER_CABINET)
    v.cornerWidthA = false;
    v.cornerWidthB = false;
    v.cornerMechanism = false;
    v.cornerShelfQuantity = false;
    v.isUpperCorner = false;

    // wartości domyślne
    // kitchenCabinetType: [KitchenCabinetType.BASE_ONE_DOOR], -- ta wartosc ustawiana jest przy wyborze typu szafki
    form.patchValue({
      width: 400,
      height: 825,
      depth: 500,
      drawerModel: [null],
      drawerQuantity: 0,
      shelfQuantity: 1
    });
    //mozlowosc edycji
    this.setControlEnabled(form.get('drawerQuantity'), v.drawerQuantity);
    this.setControlEnabled(form.get('shelfQuantity'), v.shelfQuantity);
    this.setControlEnabled(form.get('drawerModel'), v.drawerModel);
  }

  private setControlEnabled(control: AbstractControl | null, enabled: boolean): void {
    if (!control) return;
    enabled ? control.enable() : control.disable();
  }
}
