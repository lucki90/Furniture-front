import { AbstractControl, FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from "../../type-config/preparer/kitchen-cabinet-preparer";
import { CabinetFormVisibility } from "../../type-config/preparer/cabinet-form-visibility";

export class BaseWithDrawersCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // widoczność - szuflady widoczne, półki ukryte
    v.shelfQuantity = false;
    v.drawerQuantity = true;
    v.drawerModel = true;

    // wartości domyślne dla szafki z szufladami
    form.patchValue({
      width: 450,
      height: 825,
      depth: 500,
      shelfQuantity: 0,
      drawerQuantity: 3,
      drawerModel: 'ANTARO_TANDEMBOX'
    });

    // możliwość edycji
    this.setControlEnabled(form.get('drawerQuantity'), v.drawerQuantity);
    this.setControlEnabled(form.get('shelfQuantity'), v.shelfQuantity);
    this.setControlEnabled(form.get('drawerModel'), v.drawerModel);
  }

  private setControlEnabled(control: AbstractControl | null, enabled: boolean): void {
    if (!control) return;
    enabled ? control.enable() : control.disable();
  }
}
