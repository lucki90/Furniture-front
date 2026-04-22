// TODO R.9: Factory function for simple preparers — most preparers differ only in default width
// (400 vs 600mm) and which extra visibility flags they set. A `createSimplePreparer(defaults)`
// factory would collapse ~8 near-identical concrete classes into a single parameterised instance.
import { AbstractControl, FormGroup } from '@angular/forms';
import { CabinetFormVisibility } from './cabinet-form-visibility';

/**
 * Ustawia widoczność pól wspólnych dla wszystkich standardowych szafek
 * (BASE_ONE_DOOR, BASE_TWO_DOOR, UPPER_ONE_DOOR, UPPER_TWO_DOOR i pokrewnych).
 *
 * Resetuje: narożnik, szuflady, segmenty.
 * Pokazuje: width, shelfQuantity, enclosureSection.
 */
export function setStandardDoorVisibility(v: CabinetFormVisibility): void {
  v.width = true;
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

  // Pokaż sekcję obudowy bocznej
  v.enclosureSection = true;
}

/**
 * Ustawia dodatkowe flagi widoczności charakterystyczne dla szafek DOLNYCH (BASE_*).
 * Musi być wywołany po setStandardDoorVisibility().
 */
export function setBaseExtraVisibility(v: CabinetFormVisibility): void {
  v.bottomWreathOnFloor = true;
  v.positioningMode = false;
  v.gapFromCountertopMm = false;
  v.liftUp = false;
  v.extendedFront = false;
}

/**
 * Ustawia dodatkowe flagi widoczności charakterystyczne dla szafek WISZĄCYCH (UPPER_*).
 * Musi być wywołany po setStandardDoorVisibility().
 *
 * @param v - visibility object
 * @param liftUpVisible - czy pole lift-up ma być widoczne (true dla ONE_DOOR, false dla TWO_DOOR)
 */
export function setUpperExtraVisibility(v: CabinetFormVisibility, liftUpVisible: boolean): void {
  v.bottomWreathOnFloor = false;
  v.positioningMode = true;
  v.gapFromCountertopMm = true;
  v.gapFromAnchorMm = true;   // Odstęp od słupka (dla RELATIVE_TO_CEILING nad TALL)
  v.liftUp = liftUpVisible;
  v.extendedFront = true;
}

/**
 * Włącza lub wyłącza kontrolkę formularza.
 * Wspólna logika dla wszystkich preparerów — zastępuje prywatną metodę w każdej klasie.
 */
export function setControlEnabled(control: AbstractControl | null, enabled: boolean): void {
  if (!control) return;
  enabled ? control.enable() : control.disable();
}
