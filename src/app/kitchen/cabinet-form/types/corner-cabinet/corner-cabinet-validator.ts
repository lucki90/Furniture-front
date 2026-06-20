import { AbstractControl, FormGroup, ValidationErrors, Validators } from "@angular/forms";
import {
  CabinetFormValidationErrorCode,
  cabinetFormValidationError,
} from "../../cabinet-form-validation-error";
import { KitchenCabinetValidator } from "../../type-config/validator/kitchen-cabinet-validator";
import {
  CornerMechanismType,
  CornerSystemLine,
  BASE_CORNER_CONSTRAINTS,
  UPPER_CORNER_CONSTRAINTS,
  BLIND_CORNER_CONSTRAINTS,
  UPPER_BLIND_CORNER_CONSTRAINTS,
  CORNER_HANDLE_FILLER_WIDTH_MM,
  CornerHandleType,
  effectiveFrontMinWidthMm,
  isAllowedForUpperCabinet,
  isBlindType,
  isLeMans
} from "../../model/corner-cabinet.model";

/**
 * Per-system Type B angle limits (manufacturer reference §12) — mirror of the backend
 * {@code CornerCabinetKitchenCabinetValidator}. Angle is validated only when provided
 * (Angular Validators.min/max treat null/empty as valid), matching the backend `angle != null` guard.
 */
const LE_MANS_MIN_ANGLE_DEG = 85;
const MAGIC_COMFORT_MAX_ANGLE_DEG = 90;
const MAGIC_STANDARD_MAX_ANGLE_DEG = 75;

/** Le Mans dopuszcza front 16–19 mm (manufacturer reference §12) — mirror backendu. */
const LE_MANS_FRONT_THICKNESS_MIN_MM = 16;
const LE_MANS_FRONT_THICKNESS_MAX_MM = 19;

/**
 * Domyślna grubość frontu (mm) gdy pole `cornerFrontThicknessMm` nie jest ustawione.
 * Mirror backendowego DEFAULT_FRONT_THICKNESS_MM — używane jako podłoga progu blendy
 * (książka: bez uchwytu blenda = grubość frontu, z uchwytem 50mm).
 */
const DEFAULT_FRONT_THICKNESS_MM = 18;

/**
 * Custom validator: Magic Corner Comfort nie obsługuje linii LINE_400 (siatka producenta od 450).
 * Zwraca typowany kod błędu, aby pole „Linia systemu"
 * pokazało czytelny komunikat inline, gdy do formularza trafi stan legacy / ręcznie wstrzyknięta wartość.
 */
function magicComfortLineValidator(control: AbstractControl): ValidationErrors | null {
  return control.value === CornerSystemLine.LINE_400
    ? cabinetFormValidationError(CabinetFormValidationErrorCode.MAGIC_COMFORT_LINE_400_UNSUPPORTED)
    : null;
}

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

    // Szafka narożna NIE używa kanonicznego pola `width` (ma własne cornerWidthA/B).
    // Pole `width` pozostaje ukryte (visibility.width=false), ale jest enabled, więc
    // gdyby zachowało walidatory poprzedniego typu (np. BASE_ONE_DOOR max=600), a preparer
    // narożnika patchuje width=900/1000, to `width` byłoby invalid → form.invalid →
    // przycisk "Dodaj szafkę" zablokowany bez widocznego powodu. Czyścimy te walidatory.
    form.get('width')?.clearValidators();

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
    form.get('width')?.updateValueAndValidity(noEmit);
    form.get('cornerWidthA')?.updateValueAndValidity(noEmit);
    form.get('cornerWidthB')?.updateValueAndValidity(noEmit);
    form.get('height')?.updateValueAndValidity(noEmit);
    form.get('depth')?.updateValueAndValidity(noEmit);
    form.get('cornerMechanism')?.updateValueAndValidity(noEmit);
    form.get('cornerShelfQuantity')?.updateValueAndValidity(noEmit);
    form.get('cornerFrontUchylnyWidthMm')?.updateValueAndValidity(noEmit);
    form.get('blindPanelVisibleWidthMm')?.updateValueAndValidity(noEmit);
    form.get('cornerOpeningAngleDeg')?.updateValueAndValidity(noEmit);
    form.get('cornerFrontThicknessMm')?.updateValueAndValidity(noEmit);
    form.get('cornerSystemLine')?.updateValueAndValidity(noEmit);

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
      Validators.max(constraints.widthMax)
    ]);

    // Szerokość B
    form.get('cornerWidthB')?.setValidators([
      Validators.required,
      Validators.min(constraints.widthMin),
      Validators.max(constraints.widthMax)
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
    form.get('blindPanelVisibleWidthMm')?.clearValidators();
    // Parametry systemowe (kąt / grubość frontu / linia) dotyczą tylko Type B; w Type A bez ograniczeń.
    form.get('cornerOpeningAngleDeg')?.clearValidators();
    form.get('cornerFrontThicknessMm')?.clearValidators();
    form.get('cornerSystemLine')?.clearValidators();
  }

  // ==================== TYPE B (BLIND/RECTANGULAR) ====================

  private validateTypeB(form: FormGroup, mechanism: CornerMechanismType): void {
    // Wiszący ślepy narożnik (BLIND_CORNER + górny) ma własne, książkowe wymiary (depth 320,
    // width 660–960, height 300–1200, half 0–4) — parytet z backendowym validateTypeB.
    const upperBlind = (form.get('isUpperCorner')?.value ?? false)
      && mechanism === CornerMechanismType.BLIND_CORNER;
    const constraints = upperBlind ? UPPER_BLIND_CORNER_CONSTRAINTS : BLIND_CORNER_CONSTRAINTS;

    // Szerokość A (tylko widthA, brak widthB)
    form.get('cornerWidthA')?.setValidators([
      Validators.required,
      Validators.min(constraints.widthMin),
      Validators.max(constraints.widthMax)
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

    // Półki (tylko BLIND_CORNER: dolny 0–2, wiszący 0–4)
    if (mechanism === CornerMechanismType.BLIND_CORNER) {
      form.get('cornerShelfQuantity')?.setValidators([
        Validators.required,
        Validators.min(constraints.shelfMin),
        Validators.max(constraints.shelfMax)
      ]);
    } else {
      form.get('cornerShelfQuantity')?.clearValidators();
    }

    // frontUchylnyWidthMm — wymagane dla Type B. Minimalna szerokość zależy od systemu/linii:
    // Magic Corner używa Y-min wybranej linii (lub domyślnej systemu), pozostałe Type B = 400mm.
    // Wiszący ślepy narożnik: książkowy min 296mm. Mirror backendowego effectiveFrontMinWidth.
    const systemLine = form.get('cornerSystemLine')?.value as CornerSystemLine | null;
    const frontUchylnyMin = upperBlind
      ? UPPER_BLIND_CORNER_CONSTRAINTS.frontUchylnyMin
      : effectiveFrontMinWidthMm(mechanism, systemLine);
    form.get('cornerFrontUchylnyWidthMm')?.setValidators([
      Validators.required,
      Validators.min(frontUchylnyMin),
      Validators.max(constraints.frontUchylnyMax)
    ]);

    // Parametry systemu (Magic Corner / Le Mans) — twarde limity kąta otwarcia (manufacturer reference §12).
    // Mirror backendu: walidacja tylko gdy kąt podany (Validators.min/max traktują null jako poprawne).
    this.applyOpeningAngleValidators(form, mechanism);
    // Grubość frontu (Le Mans 16–19 mm) i niedozwolona linia (Magic Comfort + LINE_400) — mirror backendu.
    this.applyFrontThicknessValidators(form, mechanism);
    this.applySystemLineValidators(form, mechanism);

    const handleType = (form.get('cornerHandleType')?.value ?? CornerHandleType.SCREWED) as CornerHandleType;
    const minVisibleWidth = this.resolveBlindPanelMinWidth(form, handleType);

    if (form.get('blindPanelSplitEnabled')?.value) {
      form.get('blindPanelVisibleWidthMm')?.setValidators([
        Validators.required,
        Validators.min(minVisibleWidth),
        Validators.max(600)
      ]);
    } else {
      form.get('blindPanelVisibleWidthMm')?.clearValidators();
    }
  }

  /**
   * Ustawia twarde limity kąta otwarcia dla parametrów systemu Type B (Magic Corner / Le Mans),
   * mirror backendowego {@code validateTypeBSystem}. Walidacja odpala się tylko gdy kąt jest podany.
   */
  private applyOpeningAngleValidators(form: FormGroup, mechanism: CornerMechanismType): void {
    const angleControl = form.get('cornerOpeningAngleDeg');
    if (!angleControl) {
      return;
    }
    if (isLeMans(mechanism)) {
      angleControl.setValidators([Validators.min(LE_MANS_MIN_ANGLE_DEG)]);
    } else if (mechanism === CornerMechanismType.MAGIC_CORNER_COMFORT) {
      angleControl.setValidators([Validators.max(MAGIC_COMFORT_MAX_ANGLE_DEG)]);
    } else if (mechanism === CornerMechanismType.MAGIC_CORNER_STANDARD) {
      angleControl.setValidators([Validators.max(MAGIC_STANDARD_MAX_ANGLE_DEG)]);
    } else {
      angleControl.clearValidators();
    }
  }

  /**
   * Ustawia limity grubości frontu dla Le Mans (16–19 mm), mirror backendu (manufacturer reference §12).
   * Walidacja odpala się tylko gdy grubość jest podana (Validators.min/max traktują null jako poprawne) —
   * parytet z backendowym guardem `thickness != null` (źródłem prawdy pozostaje grubość frontu z materiałów/BOM).
   */
  private applyFrontThicknessValidators(form: FormGroup, mechanism: CornerMechanismType): void {
    const thicknessControl = form.get('cornerFrontThicknessMm');
    if (!thicknessControl) {
      return;
    }
    if (isLeMans(mechanism)) {
      thicknessControl.setValidators([
        Validators.min(LE_MANS_FRONT_THICKNESS_MIN_MM),
        Validators.max(LE_MANS_FRONT_THICKNESS_MAX_MM)
      ]);
    } else {
      thicknessControl.clearValidators();
    }
  }

  /**
   * Magic Corner Comfort nie obsługuje linii LINE_400 — ustawia custom validator (mirror backendu),
   * dzięki czemu pole „Linia systemu" pokaże błąd inline dla stanu legacy / ręcznie wstrzykniętej wartości.
   */
  private applySystemLineValidators(form: FormGroup, mechanism: CornerMechanismType): void {
    const lineControl = form.get('cornerSystemLine');
    if (!lineControl) {
      return;
    }
    if (mechanism === CornerMechanismType.MAGIC_CORNER_COMFORT) {
      lineControl.setValidators([magicComfortLineValidator]);
    } else {
      lineControl.clearValidators();
    }
  }

  /**
   * Minimalna szerokość widocznej części frontu ślepego (blenda narożna).
   * Książka: z uchwytem blenda = 50mm, bez uchwytu = grubość frontu (≈18–20mm).
   * Mirror backendu: `Math.max(handle.fillerWidth, frontThickness)`. Stosowane identycznie
   * dla narożnika dolnego i wiszącego (decyzja użytkownika 2026-06-02, pkt 8).
   */
  private resolveBlindPanelMinWidth(form: FormGroup, handleType: CornerHandleType): number {
    const handleFloor = CORNER_HANDLE_FILLER_WIDTH_MM[handleType];
    const frontThickness = form.get('cornerFrontThicknessMm')?.value as number | null;
    const frontThicknessFloor = frontThickness != null && frontThickness > 0
      ? frontThickness
      : DEFAULT_FRONT_THICKNESS_MM;
    return Math.max(handleFloor, frontThicknessFloor);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Sprawdza czy wybrany mechanizm jest dozwolony dla typu szafki.
   */
  isMechanismValid(form: FormGroup): boolean {
    const isUpper = form.get('isUpperCorner')?.value ?? false;
    const mechanism = form.get('cornerMechanism')?.value as CornerMechanismType;

    if (!mechanism) return false;
    // Wiszący narożnik: dozwolone Type A (FIXED_SHELVES) oraz wiszący ślepy narożnik (BLIND_CORNER).
    // Magic Corner / Le Mans nie mają wariantu wiszącego → isAllowedForUpperCabinet je odrzuca.
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

    // Wiszący narożnik: dozwolone Type A (FIXED_SHELVES) oraz wiszący ślepy narożnik (BLIND_CORNER).
    // Magic Corner / Le Mans nie mają wariantu wiszącego.
    if (isUpper && !isAllowedForUpperCabinet(mechanism)) {
      return 'Ten mechanizm jest dostępny tylko dla szafki dolnej. Dla szafki górnej wybierz "Półki stałe", "Brak" lub "Ślepy narożnik".';
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
    const wantsUpper = form.get('isUpperCorner')?.value ?? false;

    const upperBlind = typeB && mechanism === CornerMechanismType.BLIND_CORNER && wantsUpper;
    const isUpper = !typeB && wantsUpper;
    const constraints = upperBlind ? UPPER_BLIND_CORNER_CONSTRAINTS
                      : typeB ? BLIND_CORNER_CONSTRAINTS
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
      const systemLine = form.get('cornerSystemLine')?.value as CornerSystemLine | null;
      const frontUchylnyMin = upperBlind
        ? UPPER_BLIND_CORNER_CONSTRAINTS.frontUchylnyMin
        : effectiveFrontMinWidthMm(mechanism, systemLine);
      const frontUchylnyMax = upperBlind
        ? UPPER_BLIND_CORNER_CONSTRAINTS.frontUchylnyMax
        : BLIND_CORNER_CONSTRAINTS.frontUchylnyMax;
      const frontUchylny = form.get('cornerFrontUchylnyWidthMm')?.value;
      if (!frontUchylny || frontUchylny < frontUchylnyMin
          || frontUchylny > frontUchylnyMax) {
        errors.push(`Szerokość frontu uchylnego musi być między ${frontUchylnyMin} a ${frontUchylnyMax}mm`);
      }

      // Parametry systemu (Magic Corner / Le Mans) — mirror backendu validateTypeBSystem.
      const angle = form.get('cornerOpeningAngleDeg')?.value as number | null;
      if (angle != null) {
        if (isLeMans(mechanism) && angle < LE_MANS_MIN_ANGLE_DEG) {
          errors.push(`Le Mans wymaga kąta otwarcia ≥ ${LE_MANS_MIN_ANGLE_DEG}° (podano ${angle}°)`);
        } else if (mechanism === CornerMechanismType.MAGIC_CORNER_COMFORT && angle > MAGIC_COMFORT_MAX_ANGLE_DEG) {
          errors.push(`Magic Corner Comfort dopuszcza maks. ${MAGIC_COMFORT_MAX_ANGLE_DEG}° otwarcia (podano ${angle}°)`);
        } else if (mechanism === CornerMechanismType.MAGIC_CORNER_STANDARD && angle > MAGIC_STANDARD_MAX_ANGLE_DEG) {
          errors.push(`Magic Corner Standard dopuszcza maks. ${MAGIC_STANDARD_MAX_ANGLE_DEG}° otwarcia (podano ${angle}°)`);
        }
      }

      // Magic Corner Comfort nie obsługuje linii 400 (siatka od 450) — mirror backendu.
      if (mechanism === CornerMechanismType.MAGIC_CORNER_COMFORT && systemLine === CornerSystemLine.LINE_400) {
        errors.push('Magic Corner Comfort nie obsługuje linii 400 — wybierz linię 450 lub wyższą.');
      }

      if (form.get('blindPanelSplitEnabled')?.value) {
        const blindPanelVisibleWidth = form.get('blindPanelVisibleWidthMm')?.value;
        const handleType = (form.get('cornerHandleType')?.value ?? CornerHandleType.SCREWED) as CornerHandleType;
        const minVisibleWidth = this.resolveBlindPanelMinWidth(form, handleType);
        if (blindPanelVisibleWidth == null || blindPanelVisibleWidth < minVisibleWidth || blindPanelVisibleWidth > 600) {
          errors.push(`Szerokość widocznej części frontu ślepego musi być między ${minVisibleWidth} a 600mm`);
        }
      }
    }

    return errors;
  }
}
