import { FormGroup, Validators } from "@angular/forms";
import { KitchenCabinetValidator } from "../../type-config/validator/kitchen-cabinet-validator";
import { widthStepValidator } from "../../validators/width-step.validator";
import {
  CornerMechanismType,
  BASE_CORNER_CONSTRAINTS,
  UPPER_CORNER_CONSTRAINTS,
  BLIND_CORNER_CONSTRAINTS,
  isAllowedForUpperCabinet,
  isBlindType
} from "../../model/corner-cabinet.model";

/**
 * Validator dla szafki narożnej (CORNER_CABINET).
 *
 * Routuje walidację do Type A lub Type B na podstawie mechanizmu:
 * - Type A (L-shaped): widthA + widthB, dolna/górna
 * - Type B (Blind): widthA only, zawsze dolna, frontUchylnyWidthMm wymagane
 */
export class CornerCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    const mechanism = form.get('cornerMechanism')?.value as CornerMechanismType;

    if (mechanism && isBlindType(mechanism)) {
      this.validateTypeB(form, mechanism);
    } else {
      this.validateTypeA(form);
    }

    // Aktualizuj walidację wszystkich pól.
    // UWAGA: emitEvent: false — zapobiega nieskończonej pętli:
    //   cornerMechanism.updateValueAndValidity() emitowałoby valueChanges
    //   → onCornerMechanismChange() → validate() → ... → StackOverflow
    const noEmit = { emitEvent: false };
    form.get('cornerWidthA')?.updateValueAndValidity(noEmit);
    form.get('cornerWidthB')?.updateValueAndValidity(noEmit);
    form.get('height')?.updateValueAndValidity(noEmit);
    form.get('depth')?.updateValueAndValidity(noEmit);
    form.get('cornerMechanism')?.updateValueAndValidity(noEmit);
    form.get('cornerShelfQuantity')?.updateValueAndValidity(noEmit);
    form.get('cornerFrontUchylnyWidthMm')?.updateValueAndValidity(noEmit);

    form.updateValueAndValidity(noEmit);
  }

  // ==================== TYPE A (L-SHAPED) ====================

  private validateTypeA(form: FormGroup): void {
    const isUpper = form.get('isUpperCorner')?.value ?? false;
    const constraints = isUpper ? UPPER_CORNER_CONSTRAINTS : BASE_CORNER_CONSTRAINTS;

    // Szerokość A
    form.get('cornerWidthA')?.setValidators([
      Validators.required,
      Validators.min(constraints.widthMin),
      Validators.max(constraints.widthMax),
      widthStepValidator(constraints.widthMin, constraints.widthStep)
    ]);

    // Szerokość B
    form.get('cornerWidthB')?.setValidators([
      Validators.required,
      Validators.min(constraints.widthMin),
      Validators.max(constraints.widthMax),
      widthStepValidator(constraints.widthMin, constraints.widthStep)
    ]);

    // Wysokość
    form.get('height')?.setValidators([
      Validators.required,
      Validators.min(constraints.heightMin),
      Validators.max(constraints.heightMax)
    ]);

    // Głębokość
    form.get('depth')?.setValidators([
      Validators.required,
      Validators.min(constraints.depth),
      Validators.max(constraints.depth)
    ]);

    // Mechanizm
    form.get('cornerMechanism')?.setValidators([Validators.required]);

    // Półki (tylko FIXED_SHELVES)
    const mechanism = form.get('cornerMechanism')?.value as CornerMechanismType;
    if (mechanism === CornerMechanismType.FIXED_SHELVES) {
      form.get('cornerShelfQuantity')?.setValidators([
        Validators.required,
        Validators.min(constraints.shelfMin),
        Validators.max(constraints.shelfMax)
      ]);
    } else {
      form.get('cornerShelfQuantity')?.clearValidators();
    }

    // frontUchylnyWidthMm — nie wymagane dla Type A
    form.get('cornerFrontUchylnyWidthMm')?.clearValidators();
  }

  // ==================== TYPE B (BLIND/RECTANGULAR) ====================

  private validateTypeB(form: FormGroup, mechanism: CornerMechanismType): void {
    const constraints = BLIND_CORNER_CONSTRAINTS;

    // Szerokość A (tylko widthA, brak widthB)
    form.get('cornerWidthA')?.setValidators([
      Validators.required,
      Validators.min(constraints.widthMin),
      Validators.max(constraints.widthMax),
      widthStepValidator(constraints.widthMin, constraints.widthStep)
    ]);

    // Szerokość B — nie wymagana dla Type B
    form.get('cornerWidthB')?.clearValidators();

    // Wysokość
    form.get('height')?.setValidators([
      Validators.required,
      Validators.min(constraints.heightMin),
      Validators.max(constraints.heightMax)
    ]);

    // Głębokość — stała, ustawiana przez backend
    form.get('depth')?.clearValidators();

    // Mechanizm
    form.get('cornerMechanism')?.setValidators([Validators.required]);

    // Półki (tylko BLIND_CORNER: 0-2)
    if (mechanism === CornerMechanismType.BLIND_CORNER) {
      form.get('cornerShelfQuantity')?.setValidators([
        Validators.required,
        Validators.min(constraints.shelfMin),
        Validators.max(constraints.shelfMax)
      ]);
    } else {
      form.get('cornerShelfQuantity')?.clearValidators();
    }

    // frontUchylnyWidthMm — wymagane dla Type B (400-600mm)
    form.get('cornerFrontUchylnyWidthMm')?.setValidators([
      Validators.required,
      Validators.min(constraints.frontUchylnyMin),
      Validators.max(constraints.frontUchylnyMax)
    ]);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Sprawdza czy wybrany mechanizm jest dozwolony dla typu szafki.
   */
  isMechanismValid(form: FormGroup): boolean {
    const isUpper = form.get('isUpperCorner')?.value ?? false;
    const mechanism = form.get('cornerMechanism')?.value as CornerMechanismType;

    if (!mechanism) return false;
    if (isUpper && isBlindType(mechanism)) return false;
    if (isUpper && !isAllowedForUpperCabinet(mechanism)) return false;

    return true;
  }

  /**
   * Zwraca błąd walidacji mechanizmu.
   */
  getMechanismError(form: FormGroup): string | null {
    const isUpper = form.get('isUpperCorner')?.value ?? false;
    const mechanism = form.get('cornerMechanism')?.value as CornerMechanismType;

    if (!mechanism) return 'Wybierz system organizacji wewnętrznej.';

    if (isUpper && isBlindType(mechanism)) {
      return 'Ślepy narożnik jest dostępny tylko jako szafka dolna.';
    }

    if (isUpper && !isAllowedForUpperCabinet(mechanism)) {
      return 'Ten mechanizm jest dostępny tylko dla szafki dolnej. Dla szafki górnej wybierz "Półki stałe" lub "Brak".';
    }

    return null;
  }

  /**
   * Zwraca błędy walidacji wymiarów.
   */
  getDimensionErrors(form: FormGroup): string[] {
    const errors: string[] = [];
    const mechanism = form.get('cornerMechanism')?.value as CornerMechanismType;
    const typeB = mechanism && isBlindType(mechanism);

    const isUpper = !typeB && (form.get('isUpperCorner')?.value ?? false);
    const constraints = typeB ? BLIND_CORNER_CONSTRAINTS
                      : isUpper ? UPPER_CORNER_CONSTRAINTS
                      : BASE_CORNER_CONSTRAINTS;

    const widthA = form.get('cornerWidthA')?.value;
    const height = form.get('height')?.value;

    if (widthA < constraints.widthMin || widthA > constraints.widthMax) {
      errors.push(`Szerokość A musi być między ${constraints.widthMin} a ${constraints.widthMax}mm`);
    } else if ((widthA - constraints.widthMin) % constraints.widthStep !== 0) {
      errors.push(`Szerokość A musi być wielokrotnością ${constraints.widthStep}mm`);
    }

    if (!typeB) {
      const widthB = form.get('cornerWidthB')?.value;
      const c = constraints as typeof BASE_CORNER_CONSTRAINTS;
      if (widthB < c.widthMin || widthB > c.widthMax) {
        errors.push(`Szerokość B musi być między ${c.widthMin} a ${c.widthMax}mm`);
      }
    }

    if (height < constraints.heightMin || height > constraints.heightMax) {
      errors.push(`Wysokość musi być między ${constraints.heightMin} a ${constraints.heightMax}mm`);
    }

    if (typeB) {
      const frontUchylny = form.get('cornerFrontUchylnyWidthMm')?.value;
      if (!frontUchylny || frontUchylny < BLIND_CORNER_CONSTRAINTS.frontUchylnyMin
          || frontUchylny > BLIND_CORNER_CONSTRAINTS.frontUchylnyMax) {
        errors.push(`Szerokość frontu uchylnego musi być między ${BLIND_CORNER_CONSTRAINTS.frontUchylnyMin} a ${BLIND_CORNER_CONSTRAINTS.frontUchylnyMax}mm`);
      }
    }

    return errors;
  }
}
