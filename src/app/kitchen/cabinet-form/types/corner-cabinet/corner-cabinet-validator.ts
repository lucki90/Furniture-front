import { FormGroup, Validators } from "@angular/forms";
import { KitchenCabinetValidator } from "../../type-config/validator/kitchen-cabinet-validator";
import { widthStepValidator } from "../../validators/width-step.validator";
import {
  CornerMechanismType,
  BASE_CORNER_CONSTRAINTS,
  UPPER_CORNER_CONSTRAINTS,
  isAllowedForUpperCabinet
} from "../../model/corner-cabinet.model";

/**
 * Validator dla szafki narożnej (CORNER_CABINET).
 * Waliduje wymiary dla dolnej i górnej wersji oraz mechanizmy.
 */
export class CornerCabinetValidator implements KitchenCabinetValidator {

  validate(form: FormGroup): void {
    const isUpper = form.get('isUpperCorner')?.value ?? false;
    const constraints = isUpper ? UPPER_CORNER_CONSTRAINTS : BASE_CORNER_CONSTRAINTS;

    // Walidacja szerokości A
    form.get('cornerWidthA')?.setValidators([
      Validators.required,
      Validators.min(constraints.widthMin),
      Validators.max(constraints.widthMax),
      widthStepValidator(constraints.widthMin, constraints.widthStep)
    ]);

    // Walidacja szerokości B
    form.get('cornerWidthB')?.setValidators([
      Validators.required,
      Validators.min(constraints.widthMin),
      Validators.max(constraints.widthMax),
      widthStepValidator(constraints.widthMin, constraints.widthStep)
    ]);

    // Walidacja wysokości
    form.get('height')?.setValidators([
      Validators.required,
      Validators.min(constraints.heightMin),
      Validators.max(constraints.heightMax)
    ]);

    // Walidacja głębokości (stała wartość dla obu typów)
    form.get('depth')?.setValidators([
      Validators.required,
      Validators.min(constraints.depth),
      Validators.max(constraints.depth)
    ]);

    // Walidacja mechanizmu
    form.get('cornerMechanism')?.setValidators([
      Validators.required
    ]);

    // Walidacja liczby półek (tylko dla FIXED_SHELVES)
    const mechanism = form.get('cornerMechanism')?.value;
    if (mechanism === CornerMechanismType.FIXED_SHELVES) {
      form.get('cornerShelfQuantity')?.setValidators([
        Validators.required,
        Validators.min(constraints.shelfMin),
        Validators.max(constraints.shelfMax)
      ]);
    } else {
      form.get('cornerShelfQuantity')?.clearValidators();
    }

    // Aktualizuj walidację pól
    form.get('cornerWidthA')?.updateValueAndValidity();
    form.get('cornerWidthB')?.updateValueAndValidity();
    form.get('height')?.updateValueAndValidity();
    form.get('depth')?.updateValueAndValidity();
    form.get('cornerMechanism')?.updateValueAndValidity();
    form.get('cornerShelfQuantity')?.updateValueAndValidity();

    form.updateValueAndValidity();
  }

  /**
   * Sprawdza czy wybrany mechanizm jest dozwolony dla typu szafki.
   */
  isMechanismValid(form: FormGroup): boolean {
    const isUpper = form.get('isUpperCorner')?.value ?? false;
    const mechanism = form.get('cornerMechanism')?.value as CornerMechanismType;

    if (!mechanism) return false;

    if (isUpper && !isAllowedForUpperCabinet(mechanism)) {
      return false;
    }

    return true;
  }

  /**
   * Zwraca błąd walidacji mechanizmu.
   */
  getMechanismError(form: FormGroup): string | null {
    const isUpper = form.get('isUpperCorner')?.value ?? false;
    const mechanism = form.get('cornerMechanism')?.value as CornerMechanismType;

    if (!mechanism) {
      return 'Wybierz system organizacji wewnętrznej.';
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
    const isUpper = form.get('isUpperCorner')?.value ?? false;
    const constraints = isUpper ? UPPER_CORNER_CONSTRAINTS : BASE_CORNER_CONSTRAINTS;

    const widthA = form.get('cornerWidthA')?.value;
    const widthB = form.get('cornerWidthB')?.value;
    const height = form.get('height')?.value;

    if (widthA < constraints.widthMin || widthA > constraints.widthMax) {
      errors.push(`Szerokość A musi być między ${constraints.widthMin} a ${constraints.widthMax}mm`);
    } else if ((widthA - constraints.widthMin) % constraints.widthStep !== 0) {
      errors.push(`Szerokość A musi być wielokrotnością ${constraints.widthStep}mm`);
    }

    if (widthB < constraints.widthMin || widthB > constraints.widthMax) {
      errors.push(`Szerokość B musi być między ${constraints.widthMin} a ${constraints.widthMax}mm`);
    } else if ((widthB - constraints.widthMin) % constraints.widthStep !== 0) {
      errors.push(`Szerokość B musi być wielokrotnością ${constraints.widthStep}mm`);
    }

    if (height < constraints.heightMin || height > constraints.heightMax) {
      errors.push(`Wysokość musi być między ${constraints.heightMin} a ${constraints.heightMax}mm`);
    }

    return errors;
  }
}
