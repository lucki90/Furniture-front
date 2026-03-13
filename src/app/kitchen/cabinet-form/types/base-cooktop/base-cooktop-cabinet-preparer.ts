import { AbstractControl, FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';

export class BaseCooktopCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // Widoczność — standardowe pola szafki dolnej
    v.width = true;
    v.segments = false;

    // Ukryj pola narożnika
    v.cornerWidthA = false;
    v.cornerWidthB = false;
    v.cornerMechanism = false;
    v.cornerShelfQuantity = false;
    v.isUpperCorner = false;

    // Pokaż sekcję obudowy bocznej
    v.enclosureSection = true;

    // Pokaż dolny wieniec na podłodze (jak inne BASE)
    v.bottomWreathOnFloor = true;

    // Pokaż sekcję specyficzną dla szafki pod płytę
    v.cooktopType = true;       // typ płyty: GAS | INDUCTION
    v.cooktopFrontType = true;  // typ frontu: DRAWERS | TWO_DOORS | ONE_DOOR

    // Szuflady — widoczne domyślnie bo DRAWERS jest domyślny
    v.drawerQuantity = true;
    v.drawerModel = true;
    v.shelfQuantity = false;    // brak półek przy szufladach (setujemy dynamicznie)

    // Wartości domyślne
    form.patchValue({
      width: 600,
      height: 720,
      depth: 560,
      shelfQuantity: 0,
      drawerQuantity: 3,
      drawerModel: 'ANTARO_TANDEMBOX',
      cooktopType: 'INDUCTION',
      cooktopFrontType: 'DRAWERS'
    });

    // Aktywacja kontrolek
    this.setControlEnabled(form.get('drawerQuantity'), true);
    this.setControlEnabled(form.get('drawerModel'), true);
    this.setControlEnabled(form.get('shelfQuantity'), false);
    this.setControlEnabled(form.get('cooktopType'), true);
    this.setControlEnabled(form.get('cooktopFrontType'), true);
  }

  private setControlEnabled(control: AbstractControl | null, enabled: boolean): void {
    if (!control) return;
    enabled ? control.enable() : control.disable();
  }
}
