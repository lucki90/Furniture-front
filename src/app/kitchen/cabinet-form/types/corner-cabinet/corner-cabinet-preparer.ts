import { AbstractControl, FormGroup } from '@angular/forms';
import { KitchenCabinetPreparer } from '../../type-config/preparer/kitchen-cabinet-preparer';
import { CabinetFormVisibility } from '../../type-config/preparer/cabinet-form-visibility';
import {
  CornerMechanismType,
  CornerOpeningType,
  BASE_CORNER_CONSTRAINTS,
  UPPER_CORNER_CONSTRAINTS,
  BLIND_CORNER_CONSTRAINTS,
  isBlindType,
  isAllowedForUpperCabinet
} from '../../model/corner-cabinet.model';

/**
 * Preparer dla szafki narożnej (CORNER_CABINET).
 *
 * Obsługuje dwa fizycznie różne typy narożników:
 * - Type A (L-shaped): FIXED_SHELVES, NONE, CAROUSEL_270, CAROUSEL_360
 *   widthA + widthB, głębokość 560mm, typ otwarcia (TWO_DOORS | BIFOLD)
 * - Type B (Blind/Rectangular): BLIND_CORNER, MAGIC_CORNER, LE_MANS
 *   tylko widthA, głębokość 510mm, frontUchylnyWidthMm 400-600mm, wyłącznie dolna
 */
export class CornerCabinetPreparer implements KitchenCabinetPreparer {

  prepare(form: FormGroup, v: CabinetFormVisibility): void {
    // Ukryj standardowe pola — narożnik używa własnych
    v.width = false;
    v.shelfQuantity = false;
    v.drawerQuantity = false;
    v.drawerModel = false;
    v.segments = false;

    // Pola wspólne narożnika
    v.cornerWidthA = true;
    v.cornerMechanism = true;
    v.enclosureSection = true;

    // Wstępna konfiguracja na podstawie bieżącego mechanizmu
    const mechanism = (form.get('cornerMechanism')?.value ?? CornerMechanismType.FIXED_SHELVES) as CornerMechanismType;
    this.updateVisibilityForMechanism(mechanism, form, v);

    // Wartości domyślne
    this.applyDefaultValues(form, mechanism);

    // Wyłącz pola nieużywane
    this.setControlEnabled(form.get('width'), false);
    this.setControlEnabled(form.get('drawerQuantity'), false);
    this.setControlEnabled(form.get('shelfQuantity'), false);
    this.setControlEnabled(form.get('drawerModel'), false);

    // Nasłuchuj zmian mechanizmu
    this.setupMechanismListener(form, v);

    // Nasłuchuj zmian isUpperCorner (tylko Type A)
    this.setupUpperCabinetListener(form, v);
  }

  /**
   * Ustawia widoczność pól w zależności od mechanizmu (Type A / Type B).
   */
  private updateVisibilityForMechanism(
    mechanism: CornerMechanismType, form: FormGroup, v: CabinetFormVisibility
  ): void {
    const typeB = isBlindType(mechanism);

    // Type B: brak widthB, brak isUpperCorner, brak cornerOpeningType; ma frontUchylnyWidth
    v.cornerWidthB = !typeB;
    v.isUpperCorner = !typeB;
    v.cornerOpeningType = !typeB;  // BIFOLD dozwolony zarówno dla dolnych jak i górnych
    v.cornerFrontUchylnyWidth = typeB;

    // Półki: FIXED_SHELVES (Type A) lub BLIND_CORNER (Type B)
    v.cornerShelfQuantity = mechanism === CornerMechanismType.FIXED_SHELVES
      || mechanism === CornerMechanismType.BLIND_CORNER;
  }

  private applyDefaultValues(form: FormGroup, mechanism: CornerMechanismType): void {
    const typeB = isBlindType(mechanism);
    const isUpper = !typeB && (form.get('isUpperCorner')?.value ?? false);
    const constraints = typeB ? BLIND_CORNER_CONSTRAINTS
                      : isUpper ? UPPER_CORNER_CONSTRAINTS
                      : BASE_CORNER_CONSTRAINTS;

    const patch: any = {
      cornerWidthA: typeB ? 1000 : (isUpper ? 700 : 900),
      cornerWidthB: isUpper ? 700 : 900,
      height: 720,
      depth: constraints.depth,
      cornerMechanism: mechanism,
      width: typeB ? 1000 : (isUpper ? 700 : 900),
      shelfQuantity: 0,
      drawerQuantity: 0,
      drawerModel: null
    };

    if (typeB) {
      patch.cornerFrontUchylnyWidthMm = form.get('cornerFrontUchylnyWidthMm')?.value ?? 500;
      patch.cornerShelfQuantity = mechanism === CornerMechanismType.BLIND_CORNER
        ? (form.get('cornerShelfQuantity')?.value ?? 0) : 0;
      patch.isUpperCorner = false;
    } else {
      patch.cornerOpeningType = form.get('cornerOpeningType')?.value ?? CornerOpeningType.TWO_DOORS;
      patch.cornerShelfQuantity = mechanism === CornerMechanismType.FIXED_SHELVES
        ? (form.get('cornerShelfQuantity')?.value ?? 2) : 0;
    }

    form.patchValue(patch);
  }

  /**
   * Nasłuchuje zmian mechanizmu — reroutuje widoczność (Type A ↔ Type B).
   */
  private setupMechanismListener(form: FormGroup, v: CabinetFormVisibility): void {
    const mechanismControl = form.get('cornerMechanism');
    if (!mechanismControl) return;

    mechanismControl.valueChanges.subscribe((mechanism: CornerMechanismType) => {
      const typeB = isBlindType(mechanism);

      this.updateVisibilityForMechanism(mechanism, form, v);

      // Przy przejściu na Type B — wymuś dolną szafkę i wyczyść widthB
      if (typeB) {
        form.patchValue({
          isUpperCorner: false,
          cornerFrontUchylnyWidthMm: form.get('cornerFrontUchylnyWidthMm')?.value ?? 500,
          depth: BLIND_CORNER_CONSTRAINTS.depth,
          cornerShelfQuantity: mechanism === CornerMechanismType.BLIND_CORNER
            ? (form.get('cornerShelfQuantity')?.value ?? 0) : 0
        });
      } else {
        // Type A — przywróć domyślne dla isUpperCorner
        const isUpper = form.get('isUpperCorner')?.value ?? false;
        const constraints = isUpper ? UPPER_CORNER_CONSTRAINTS : BASE_CORNER_CONSTRAINTS;
        form.patchValue({
          depth: constraints.depth,
          cornerShelfQuantity: mechanism === CornerMechanismType.FIXED_SHELVES
            ? (form.get('cornerShelfQuantity')?.value ?? 2) : 0
        });
      }
    });

    // Ustaw początkowy stan cornerShelfQuantity
    v.cornerShelfQuantity = mechanismControl.value === CornerMechanismType.FIXED_SHELVES
      || mechanismControl.value === CornerMechanismType.BLIND_CORNER;
  }

  /**
   * Nasłuchuje zmian isUpperCorner (Type A only) — aktualizuje ograniczenia i widoczność cornerOpeningType.
   */
  private setupUpperCabinetListener(form: FormGroup, v: CabinetFormVisibility): void {
    const isUpperControl = form.get('isUpperCorner');
    if (!isUpperControl) return;

    isUpperControl.valueChanges.subscribe((isUpper: boolean) => {
      const mechanism = form.get('cornerMechanism')?.value as CornerMechanismType;
      const typeB = isBlindType(mechanism);
      if (typeB) return;  // Type B nie ma górnej wersji

      const constraints = isUpper ? UPPER_CORNER_CONSTRAINTS : BASE_CORNER_CONSTRAINTS;

      // cornerOpeningType zawsze widoczny dla Type A (dolna i górna obsługują TWO_DOORS i BIFOLD)
      v.cornerOpeningType = true;

      form.patchValue({
        height: 720,
        depth: constraints.depth,
        cornerWidthA: isUpper ? 700 : 900,
        cornerWidthB: isUpper ? 700 : 900
      });

      // Resetuj mechanizm jeśli niedozwolony dla górnej (tylko FIXED_SHELVES dla górnych)
      if (isUpper && mechanism && !isAllowedForUpperCabinet(mechanism)) {
        form.patchValue({ cornerMechanism: CornerMechanismType.FIXED_SHELVES });
      }
    });
  }

  private setControlEnabled(control: AbstractControl | null, enabled: boolean): void {
    if (!control) return;
    enabled ? control.enable() : control.disable();
  }
}
