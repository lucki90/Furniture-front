import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CornerMechanismType,
  CORNER_MECHANISM_LABELS,
  BASE_CORNER_MECHANISMS,
  UPPER_CORNER_MECHANISMS,
  BASE_CORNER_CONSTRAINTS,
  UPPER_CORNER_CONSTRAINTS,
  BLIND_CORNER_CONSTRAINTS,
  CornerHandleType,
  CORNER_HANDLE_FILLER_WIDTH_MM,
  CORNER_HANDLE_TYPE_LABELS,
  CornerWreathConstructionType,
  CORNER_WREATH_CONSTRUCTION_LABELS,
  CORNER_WREATH_CONSTRUCTION_TOOLTIPS,
  CornerHandedness,
  CORNER_HANDEDNESS_LABELS,
  CornerSystemLine,
  CORNER_SYSTEM_LINE_LABELS,
  effectiveFrontMinWidthMm,
  mechanismRequiresShelves,
  isBlindType,
  isMagicCorner,
  isLeMans,
  CornerSystemParamDefaults,
  defaultCornerSystemParams,
  isCornerOpeningAngleValid
} from '../../model/corner-cabinet.model';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';
import { KitchenCabinetTypeConfig } from '../../type-config/kitchen-cabinet-type-config';
import { FormFieldComponent } from '../../../../shared/form-field/form-field.component';
import { getFormError } from '../../../../shared/form-error.util';
import { SectionHeaderComponent } from '../../shared/section-header.component';

/**
 * Sekcja konfiguracji szafki narożnej (CORNER_CABINET).
 * Zarządza typem mechanizmu (Type A / Type B), wymiarami i SVG podglądem.
 * Odbiera współdzielony FormGroup od parenta.
 */
@Component({
  selector: 'app-corner-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent, SectionHeaderComponent],
  templateUrl: './corner-form.component.html',
  styleUrls: ['./corner-form.component.css']
})
export class CornerFormComponent implements OnInit {

  @Input() form!: FormGroup;

  /** Dostępne mechanizmy zależne od isUpperCorner i isBlindType. */
  availableCornerMechanisms: { value: CornerMechanismType; label: string }[] = [];
  /** Constraints zależne od typu narożnika (base/upper/blind). */
  cornerConstraints = BASE_CORNER_CONSTRAINTS;

  // Iteracja 3 poprawka 2026-05-24: `showIsUpperCorner` usunięty — pole "Typ montażu" usunięte z formularza,
  // dolna/górna wybierana w pickerze typu szafki (entry-points "Narożna" w sekcji dolnych vs wiszących).

  /** Widoczność szerokości B. */
  showCornerWidthB = true;
  /** Widoczność typu otwarcia. */
  showCornerOpeningType = true;
  showWreathConstruction = true;
  /** Widoczność szerokości frontu uchylnego (Type B). */
  showCornerFrontUchylnyWidth = false;
  /** Widoczność pola liczby półek. */
  showCornerShelfQuantity = false;

  readonly cornerMechanismLabels = CORNER_MECHANISM_LABELS;

  /** Opcje dropdown "Typ uchwytu" (Type B) — używane przez UI helper auto-doboru widthA. */
  readonly cornerHandleTypes = Object.values(CornerHandleType).map(value => ({
    value,
    label: CORNER_HANDLE_TYPE_LABELS[value]
  }));

  /** Iter.5b [A2 C]: opcje dropdown "Konstrukcja wieńca/półek" (Type A only). */
  readonly wreathConstructionOptions = Object.values(CornerWreathConstructionType).map(value => ({
    value,
    label: CORNER_WREATH_CONSTRUCTION_LABELS[value]
  }));

  /** Iter.6 (Faza 1): opcje dropdown "Strona aktywnego frontu" (Le Mans / Magic Corner). */
  readonly cornerHandednessOptions = Object.values(CornerHandedness).map(value => ({
    value,
    label: CORNER_HANDEDNESS_LABELS[value]
  }));

  /** Pełna lista linii systemowych (źródło dla filtrowanej listy per mechanizm). */
  private readonly allCornerSystemLineOptions = Object.values(CornerSystemLine).map(value => ({
    value,
    label: CORNER_SYSTEM_LINE_LABELS[value]
  }));

  /**
   * Iter.6 (Faza 1): opcje dropdown "Linia systemu" (Le Mans / Magic Corner).
   * Mutowalna — rebudowana w {@link onCornerMechanismChange}; Magic Corner Comfort
   * nie obsługuje LINE_400 (siatka producenta od 450), więc ta opcja jest odfiltrowana.
   */
  cornerSystemLineOptions = [...this.allCornerSystemLineOptions];

  /** Widoczność sekcji parametrów systemowych (Magic Corner / Le Mans). */
  showSystemParams = false;

  /**
   * Iter.6 (Faza 1): true gdy mechanizm to jednostronny system z parametrami
   * (Magic Corner Comfort/Standard albo Le Mans I/II). Steruje widocznością sekcji systemowej.
   */
  get isSystemMechanism(): boolean {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    return mechanism ? (isMagicCorner(mechanism) || isLeMans(mechanism)) : false;
  }

  /**
   * Soft warning (FE-only, NIE blokuje) dla Magic Corner Standard z linią LINE_600:
   * producent wymaga korpusu ≥ 730 mm dla frontu 600 mm (książka/ref. §12).
   * Decyzja usera (Q4): ostrzeżenie + TODO, bez twardej blokady backendu.
   */
  get magicStandard730Warning(): string | null {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    if (mechanism !== CornerMechanismType.MAGIC_CORNER_STANDARD) {
      return null;
    }
    const line = this.form.get('cornerSystemLine')?.value as CornerSystemLine | null;
    const widthA = this.form.get('cornerWidthA')?.value as number | null;
    // TODO(corner-phase-2): doprecyzować min. korpus dla każdej linii Magic Standard wg karty producenta.
    if (line === CornerSystemLine.LINE_600 && widthA != null && widthA < 730) {
      return 'Magic Corner Standard z frontem linii 600 zwykle wymaga korpusu ≥ 730 mm. '
        + 'Zweryfikuj kartę producenta przed zamówieniem.';
    }
    return null;
  }

  /** Informacyjna nota o ograniczeniach producenta dla aktualnego systemu (BOM §13). */
  get systemConstraintNote(): string | null {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    if (!mechanism) {
      return null;
    }
    if (isLeMans(mechanism)) {
      return 'Le Mans: front 16–19 mm, min. 85° otwarcia.';
    }
    if (mechanism === CornerMechanismType.MAGIC_CORNER_COMFORT) {
      return 'Magic Corner Comfort: maks. 90° otwarcia, kosz przedni 10 kg, tylny 8 kg, front ≥ 446 mm (nie linia 400).';
    }
    if (mechanism === CornerMechanismType.MAGIC_CORNER_STANDARD) {
      return 'Magic Corner Standard: maks. 75° otwarcia, kosz przedni 7 kg, tylny 9 kg, front ≥ 396 mm.';
    }
    return null;
  }

  /** Tooltip dla aktualnie wybranej konstrukcji wieńca/półek. */
  get currentWreathConstructionTooltip(): string {
    const value = (this.form.get('wreathConstructionType')?.value
      ?? CornerWreathConstructionType.SPLIT_RECTANGLES) as CornerWreathConstructionType;
    return CORNER_WREATH_CONSTRUCTION_TOOLTIPS[value];
  }

  get currentBlindPanelVisibleWidthMin(): number {
    const handleType = (this.form.get('cornerHandleType')?.value ?? CornerHandleType.SCREWED) as CornerHandleType;
    return CORNER_HANDLE_FILLER_WIDTH_MM[handleType];
  }

  /**
   * Minimalna szerokość frontu uchylnego (Y) dla aktualnego systemu/linii — mirror backendu.
   * Magic Corner: Y-min wybranej linii (lub domyślnej systemu); pozostałe Type B: 400 mm.
   */
  get currentFrontUchylnyMin(): number {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    if (!mechanism) {
      return BLIND_CORNER_CONSTRAINTS.frontUchylnyMin;
    }
    const systemLine = this.form.get('cornerSystemLine')?.value as CornerSystemLine | null;
    return effectiveFrontMinWidthMm(mechanism, systemLine);
  }

  /** Dynamiczna podpowiedź zakresu frontu uchylnego (zależna od systemu/linii). */
  get frontUchylnyHint(): string {
    return `${this.currentFrontUchylnyMin}–${BLIND_CORNER_CONSTRAINTS.frontUchylnyMax} mm (domyślnie 500 mm)`;
  }

  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    // Inicjalizacja — odczytaj aktualny stan formularza
    this.initFromCurrentValues();

    // Reaguj na zmianę isUpperCorner (typ montażu)
    this.form.get('isUpperCorner')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(isUpper => this.onCornerTypeChange(isUpper));

    // Reaguj na zmianę mechanizmu
    this.form.get('cornerMechanism')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(mechanism => this.onCornerMechanismChange(mechanism));

    // Split FS1/FS2 zmienia wymagania walidacyjne dla blindPanelVisibleWidthMm.
    this.form.get('blindPanelSplitEnabled')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.revalidate());

    this.form.get('cornerHandleType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.revalidate());

    // Zmiana linii systemu przesuwa min. szerokość frontu uchylnego (Magic Corner) → rewaliduj.
    this.form.get('cornerSystemLine')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.revalidate());
  }

  /** Czy aktualny mechanizm to Type B (Blind/Rectangular). */
  get isCornerTypeB(): boolean {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    return mechanism ? isBlindType(mechanism) : false;
  }

  // getters `currentCornerMechanism` / `currentCornerMechanismLabel` przeniesione do
  // corner-dimensions (razem z SVG preview, Iteracja 3 fix 2026-05-24).

  // Iteracja 3 (2026-05-24): logika "Wartość sugerowana" + depth readonly została przeniesiona
  // do osobnego sub-komponentu `corner-dimensions` (zakładka "Podstawowe"). Tutaj zostają tylko
  // ustawienia konstrukcyjne (mechanizm, typ otwarcia, blendy, split FS1+FS2, półki, podgląd).

  /**
   * Inicjalizuje stan komponentu na podstawie aktualnych wartości formularza.
   * Wywoływane w ngOnInit — po tym jak parent ustawił wartości formularza.
   */
  private initFromCurrentValues(): void {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    const isUpper = this.form.get('isUpperCorner')?.value ?? false;

    // Najpierw aktualizuj mechanizm (ustawia constraints, flagę typeB)
    this.onCornerMechanismChange(mechanism);

    // Jeśli nie typeB, aktualizuj też isUpperCorner
    if (mechanism && !isBlindType(mechanism)) {
      this.onCornerTypeChange(isUpper);
    }
  }

  /**
   * Reaguje na zmianę typu narożnika (dolna/górna).
   * Dla Type B (Blind) ignoruje zmianę isUpperCorner.
   */
  private onCornerTypeChange(isUpper: boolean): void {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    if (mechanism && isBlindType(mechanism)) {
      return; // Type B zawsze dolna
    }

    if (isUpper) {
      this.cornerConstraints = UPPER_CORNER_CONSTRAINTS;
      this.availableCornerMechanisms = UPPER_CORNER_MECHANISMS.map(m => ({
        value: m,
        label: CORNER_MECHANISM_LABELS[m]
      }));

      // Jeśli aktualny mechanizm nie jest dozwolony dla górnej, zmień na FIXED_SHELVES
      const currentMechanism = this.form.get('cornerMechanism')?.value;
      if (!UPPER_CORNER_MECHANISMS.includes(currentMechanism)) {
        this.form.patchValue({ cornerMechanism: CornerMechanismType.FIXED_SHELVES });
      }

      // Ustaw domyślne wartości dla górnej
      this.form.patchValue({
        cornerWidthA: Math.max(UPPER_CORNER_CONSTRAINTS.widthMin,
          Math.min(this.form.get('cornerWidthA')?.value || 700, UPPER_CORNER_CONSTRAINTS.widthMax)),
        cornerWidthB: Math.max(UPPER_CORNER_CONSTRAINTS.widthMin,
          Math.min(this.form.get('cornerWidthB')?.value || 700, UPPER_CORNER_CONSTRAINTS.widthMax)),
        height: 720,
        depth: 320
      });
    } else {
      this.cornerConstraints = BASE_CORNER_CONSTRAINTS;
      this.availableCornerMechanisms = BASE_CORNER_MECHANISMS.map(m => ({
        value: m,
        label: CORNER_MECHANISM_LABELS[m]
      }));

      this.form.patchValue({
        cornerWidthA: Math.max(BASE_CORNER_CONSTRAINTS.widthMin,
          Math.min(this.form.get('cornerWidthA')?.value || 900, BASE_CORNER_CONSTRAINTS.widthMax)),
        cornerWidthB: Math.max(BASE_CORNER_CONSTRAINTS.widthMin,
          Math.min(this.form.get('cornerWidthB')?.value || 900, BASE_CORNER_CONSTRAINTS.widthMax)),
        height: 720,
        depth: BASE_CORNER_CONSTRAINTS.depth
      });
    }

    // Aktualizuj widoczność pól (Type A only)
    this.showCornerWidthB = true;
    this.showCornerOpeningType = true;
    this.showWreathConstruction = true;
    this.showCornerFrontUchylnyWidth = false;

    this.revalidate();
  }

  /**
   * Reaguje na zmianę mechanizmu narożnika.
   * Przełącza między Type A (L-shaped) a Type B (Blind/Rectangular).
   */
  private onCornerMechanismChange(mechanism: CornerMechanismType): void {
    const typeB = mechanism ? isBlindType(mechanism) : false;
    const isUpper = !typeB && (this.form.get('isUpperCorner')?.value ?? false);

    if (typeB) {
      this.cornerConstraints = BLIND_CORNER_CONSTRAINTS;
      // BUG FIX (2026-05-24): wcześniej tutaj było `[]`, co powodowało że dropdown
      // mechanizmów był pusty i użytkownik nie mógł zmienić mechanizmu po wybraniu Le Mans/Magic/Blind.
      // Lista MUSI zawierać pełen zbiór mechanizmów dostępnych dla dolnej szafki, niezależnie od aktualnego wyboru.
      this.availableCornerMechanisms = BASE_CORNER_MECHANISMS.map(m => ({
        value: m,
        label: CORNER_MECHANISM_LABELS[m]
      }));
      // Type B: depth zawsze 510mm (preparer wymusza po stronie backendu — patchujemy też FE dla spójności)
      this.form.patchValue({ depth: BLIND_CORNER_CONSTRAINTS.depth }, { emitEvent: false });
    } else if (isUpper) {
      this.cornerConstraints = UPPER_CORNER_CONSTRAINTS;
      this.availableCornerMechanisms = UPPER_CORNER_MECHANISMS.map(m => ({
        value: m,
        label: CORNER_MECHANISM_LABELS[m]
      }));
    } else {
      this.cornerConstraints = BASE_CORNER_CONSTRAINTS;
      this.availableCornerMechanisms = BASE_CORNER_MECHANISMS.map(m => ({
        value: m,
        label: CORNER_MECHANISM_LABELS[m]
      }));
    }

    // Widoczność pól specyficznych dla Type A / Type B
    this.showCornerWidthB = !typeB;
    // showIsUpperCorner usunięty — pole "Typ montażu" wyborem w pickerze (Iter.3 poprawka)
    this.showCornerOpeningType = !typeB;
    this.showWreathConstruction = !typeB;
    this.showCornerFrontUchylnyWidth = typeB;
    this.showCornerShelfQuantity = mechanismRequiresShelves(mechanism);

    // Iter.6 (Faza 1): sekcja parametrów systemowych tylko dla Magic Corner / Le Mans.
    const systemMechanism = mechanism ? (isMagicCorner(mechanism) || isLeMans(mechanism)) : false;
    this.showSystemParams = systemMechanism;

    // CR-fix: Magic Corner Comfort nie obsługuje linii 400 (siatka producenta od 450).
    // Odfiltruj LINE_400 z dropdownu i wyczyść nieaktualną wartość, jeśli była wybrana.
    const comfort = mechanism === CornerMechanismType.MAGIC_CORNER_COMFORT;
    this.cornerSystemLineOptions = comfort
      ? this.allCornerSystemLineOptions.filter(opt => opt.value !== CornerSystemLine.LINE_400)
      : [...this.allCornerSystemLineOptions];
    if (comfort && this.form.get('cornerSystemLine')?.value === CornerSystemLine.LINE_400) {
      this.form.patchValue({ cornerSystemLine: null }, { emitEvent: false });
    }

    // B4 (2026-05-29): wreathConstructionType is Type A only — clear for Type B to avoid
    // stale value in persistenceJson when user switches from Type A to Type B.
    if (typeB) {
      this.form.patchValue({ wreathConstructionType: null }, { emitEvent: false });
    }

    // Wyczyść parametry systemowe gdy mechanizm ich nie używa (np. BLIND_CORNER lub Type A).
    // W przeciwnym razie wstaw domyślne wartości zgodne z zakresami walidacji wybranego systemu.
    if (!systemMechanism) {
      this.form.patchValue({
        cornerHandedness: null,
        cornerOpeningAngleDeg: null,
        cornerFrontThicknessMm: null,
        cornerSystemLine: null
      }, { emitEvent: false });
    } else {
      const defaults = defaultCornerSystemParams(mechanism);
      if (defaults) {
        this.applySystemParamDefaults(mechanism, defaults);
      }
    }

    this.revalidate();
  }

  /**
   * Wstawia domyślne parametry systemowe (linia / kąt / grubość frontu) dla Magic Corner / Le Mans,
   * ale TYLKO dla pól pustych lub niespełniających zakresów nowego systemu. Dzięki temu:
   *  - przy dodawaniu szafki użytkownik dostaje od razu poprawny zestaw wartości,
   *  - w trybie edycji zapisane (i wciąż poprawne) wartości nie są nadpisywane,
   *  - przy zmianie systemu (np. Comfort → Standard) kąt poza zakresem (90 → maks. 75) jest korygowany.
   */
  private applySystemParamDefaults(mechanism: CornerMechanismType, d: CornerSystemParamDefaults): void {
    const patch: Record<string, unknown> = {};

    const currentLine = this.form.get('cornerSystemLine')?.value;
    if (d.systemLine != null && currentLine == null) {
      patch['cornerSystemLine'] = d.systemLine;
    }

    const currentAngle = this.form.get('cornerOpeningAngleDeg')?.value;
    if (currentAngle == null || !isCornerOpeningAngleValid(mechanism, Number(currentAngle))) {
      patch['cornerOpeningAngleDeg'] = d.openingAngleDeg;
    }

    const currentThickness = this.form.get('cornerFrontThicknessMm')?.value;
    const thickness = Number(currentThickness);
    const leMansThicknessInvalid = isLeMans(mechanism)
      && currentThickness != null && (thickness < 16 || thickness > 19);
    if (currentThickness == null || leMansThicknessInvalid) {
      patch['cornerFrontThicknessMm'] = d.frontThicknessMm;
    }

    if (Object.keys(patch).length > 0) {
      this.form.patchValue(patch, { emitEvent: false });
    }
  }

  private revalidate(): void {
    const type = this.form.get('kitchenCabinetType')?.value as KitchenCabinetType;
    if (type === KitchenCabinetType.CORNER_CABINET) {
      const config = KitchenCabinetTypeConfig[type];
      if (config) config.validator.validate(this.form);
    }
  }

  getFieldError(controlName: string): string | null {
    return getFormError(this.form.get(controlName));
  }

  protected trackByValue = (_: number, item: { value: string }) => item.value;
}
