import { AbstractControl, FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';

export class BaseSinkCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // Widoczność — standardowe pola szafki dolnej
    v.width = true;
    v.shelfQuantity = false;      // brak półek — przestrzeń techniczna pod zlewem
    v.drawerQuantity = false;     // ilość szuflad zarządzana przez sinkFrontType
    v.drawerModel = false;        // model szuflad zarządzany przez sinkDrawerModel
    v.segments = false;

    // Ukryj pola narożnika (resetowanie po CORNER_CABINET)
    v.cornerWidthA = false;
    v.cornerWidthB = false;
    v.cornerMechanism = false;
    v.cornerShelfQuantity = false;
    v.isUpperCorner = false;

    // Pokaż sekcję obudowy bocznej
    v.enclosureSection = true;

    // Pokaż opcję dolnego wieńca na podłodze (identycznie jak BASE_ONE/TWO/WITH_DRAWERS)
    v.bottomWreathOnFloor = true;

    // Pokaż sekcję specyficzną dla szafki zlewowej
    v.sinkFrontType = true;    // selector frontu (1 drzwi / 2 drzwi / szuflada)
    v.sinkApron = true;        // sekcja blendy maskującej
    v.sinkApronHeight = true;  // pole wysokości blendy (domyślnie ON)
    v.sinkDrawerModel = false; // ukryty — widoczny dopiero gdy frontType=DRAWER

    // Wartości domyślne
    form.patchValue({
      width: 600,
      height: 720,  // Wysokość korpusu (bez cokołu i blatu)
      depth: 500,
      shelfQuantity: 0,
      drawerQuantity: 0,
      drawerModel: null,
      sinkFrontType: 'TWO_DOORS',
      sinkApronEnabled: true,
      sinkApronHeightMm: 150,
      sinkDrawerModel: 'ANTARO_TANDEMBOX'
    });

    // Możliwość edycji
    this.setControlEnabled(form.get('drawerQuantity'), false);
    this.setControlEnabled(form.get('shelfQuantity'), false);
    this.setControlEnabled(form.get('drawerModel'), false);
    this.setControlEnabled(form.get('sinkFrontType'), true);
    this.setControlEnabled(form.get('sinkApronEnabled'), true);
    this.setControlEnabled(form.get('sinkApronHeightMm'), true);
    this.setControlEnabled(form.get('sinkDrawerModel'), false);
  }

  private setControlEnabled(control: AbstractControl | null, enabled: boolean): void {
    if (!control) return;
    enabled ? control.enable() : control.disable();
  }
}
