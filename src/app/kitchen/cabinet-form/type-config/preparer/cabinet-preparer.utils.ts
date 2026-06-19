import { AbstractControl, FormGroup } from '@angular/forms';
import { ProjectSettingsConstraints } from '../../model/kitchen-cabinet-constants';
import { CabinetFormVisibility } from './cabinet-form-visibility';
import { KitchenCabinetPreparer } from './kitchen-cabinet-preparer';

export interface SimpleDoorPreparerOptions {
  level: 'BASE' | 'UPPER';
  width: number;
  resetLiftUp?: boolean;
}

/**
 * Tworzy preparer standardowej szafki drzwiowej.
 * Warianty jedno- i dwudrzwiowe różnią się wyłącznie szerokością,
 * natomiast poziom BASE/UPPER określa domyślną głębokość i pozycjonowanie.
 */
export function createSimpleDoorPreparer(options: SimpleDoorPreparerOptions): KitchenCabinetPreparer {
  return {
    prepare(form: FormGroup, v: CabinetFormVisibility): void {
      setStandardDoorVisibility(v);

      if (options.level === 'BASE') {
        setBaseExtraVisibility(v);
      } else {
        setUpperExtraVisibility(v, false);
      }

      form.patchValue({
        width: options.width,
        height: 720,
        depth: options.level === 'BASE' ? 500 : 340,
        drawerModel: null,
        drawerQuantity: 0,
        shelfQuantity: 1,
        ...(options.level === 'UPPER'
          ? {
              positioningMode: 'RELATIVE_TO_CEILING',
              gapFromCountertopMm: ProjectSettingsConstraints.UPPER_GAP_FROM_COUNTERTOP_DEFAULT,
              isFrontExtended: false,
              ...(options.resetLiftUp ? { isLiftUp: false } : {})
            }
          : {})
      });

      setControlEnabled(form.get('drawerQuantity'), false);
      setControlEnabled(form.get('shelfQuantity'), true);
      setControlEnabled(form.get('drawerModel'), false);
    }
  };
}

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
  v.blockUpperAbove = true;  // Blokada szafek wiszących powyżej
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
 * @param liftUpVisible - czy checkbox lift-up ma być widoczny. Obecnie wszystkie typy UPPER_* przekazują false,
 *                        bo klapa unoszona ma własny typ UPPER_LIFT_UP zamiast checkboxa na UPPER_ONE_DOOR.
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
