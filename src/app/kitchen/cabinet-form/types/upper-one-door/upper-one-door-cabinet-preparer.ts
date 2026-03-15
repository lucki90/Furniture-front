import { AbstractControl, FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';

/**
 * Preparer dla szafki wiszącej z jednymi drzwiami (UPPER_ONE_DOOR).
 * Szafka wisząca: brak cokołu, brak blatu, montowana na szynie.
 */
export class UpperOneDoorCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // Widoczność — standardowe pola wymiarów + półki
    v.width = true;
    v.shelfQuantity = true;
    v.drawerQuantity = false;
    v.drawerModel = false;
    v.segments = false;

    // Ukryj pola narożnika
    v.cornerWidthA = false;
    v.cornerWidthB = false;
    v.cornerMechanism = false;
    v.cornerShelfQuantity = false;
    v.isUpperCorner = false;

    // Pokaż pola pozycjonowania szafek wiszących
    v.positioningMode = true;
    v.gapFromCountertopMm = true;

    // Pokaż sekcję obudowy bocznej
    v.enclosureSection = true;

    // Opcje frontu wiszącej
    v.liftUp = true;
    v.extendedFront = true;

    // Wartości domyślne — wymiary korpusu szafki wiszącej
    form.patchValue({
      width: 400,
      height: 720,     // Typowa wysokość szafki wiszącej
      depth: 320,       // Typowa głębokość szafki wiszącej
      shelfQuantity: 1,
      drawerQuantity: 0,
      drawerModel: null,
      positioningMode: 'RELATIVE_TO_CEILING',
      gapFromCountertopMm: 500,
      isLiftUp: false,
      isFrontExtended: false
    });

    // Kontrolki
    this.setControlEnabled(form.get('drawerQuantity'), false);
    this.setControlEnabled(form.get('shelfQuantity'), true);
    this.setControlEnabled(form.get('drawerModel'), false);
  }

  private setControlEnabled(control: AbstractControl | null, enabled: boolean): void {
    if (!control) return;
    enabled ? control.enable() : control.disable();
  }
}
