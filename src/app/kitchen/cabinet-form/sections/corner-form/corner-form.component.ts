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
  effectiveFrontMinWidthMm,
  mechanismRequiresShelves,
  isBlindType,
  isMagicCorner,
  isLeMans,
  CornerSystemParamDefaults,
  defaultCornerSystemParams,
  isCornerOpeningAngleValid,
  CornerMechanismGlyph,
  CORNER_MECHANISM_META
} from '../../model/corner-cabinet.model';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';
import { KitchenCabinetTypeConfig } from '../../type-config/kitchen-cabinet-type-config';
import { getFormError } from '../../../../shared/form-error.util';
import { CornerDimensionsComponent } from '../corner-dimensions/corner-dimensions.component';

/** Rodzina prezentacyjna narożnika (warstwa UI, nie zmienia modelu). */
export type CornerFamily = 'L' | 'BLIND';

/** Karta mechanizmu (krok ②) — łączy opcję z meta do renderu. */
export interface CornerMechanismCard {
  value: CornerMechanismType;
  label: string;
  abbr: string;
  glyph: CornerMechanismGlyph;
  desc: string;
  selected: boolean;
}

/**
 * Sekcja konfiguracji szafki narożnej (CORNER_CABINET).
 * Zarządza typem mechanizmu (Type A / Type B), wymiarami i SVG podglądem.
 * Odbiera współdzielony FormGroup od parenta.
 */
@Component({
  selector: 'app-corner-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, CornerDimensionsComponent],
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

  /** Opcje dropdown „Strona narożnika" (lewy/prawy) — wszystkie warianty Type B (ślepy + Magic/Le Mans). */
  readonly cornerHandednessOptions = Object.values(CornerHandedness).map(value => ({
    value,
    label: CORNER_HANDEDNESS_LABELS[value]
  }));

  // Parametry systemowe (Magic Corner / Le Mans) oraz podział frontu ślepego FS1/FS2 przeniesione
  // do osobnego sub-komponentu `app-corner-options-form` (zakładka „Opcje", UX 2026-06-01).
  // Tutaj zostaje tylko logika domenowa wstawiania defaultów + czyszczenia LINE_400 (Magic Comfort).

  /**
   * Iter.6 (Faza 1): true gdy mechanizm to jednostronny system z parametrami
   * (Magic Corner Comfort/Standard albo Le Mans I/II). Steruje widocznością sekcji systemowej.
   */
  get isSystemMechanism(): boolean {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    return mechanism ? (isMagicCorner(mechanism) || isLeMans(mechanism)) : false;
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

  // ─────────────────────────── Rodzina + karty mechanizmów (kroki ① / ②) ───────────────────────────

  /** Aktualnie wybrany mechanizm (fallback FIXED_SHELVES, jak w pickerze). */
  get currentCornerMechanism(): CornerMechanismType {
    return (this.form.get('cornerMechanism')?.value ?? CornerMechanismType.FIXED_SHELVES) as CornerMechanismType;
  }

  /** Etykieta aktualnego mechanizmu. */
  get currentCornerMechanismLabel(): string {
    return CORNER_MECHANISM_LABELS[this.currentCornerMechanism] ?? '';
  }

  /** Skrót mono aktualnego mechanizmu (do podglądu). */
  get currentCornerMechanismAbbr(): string {
    return CORNER_MECHANISM_META[this.currentCornerMechanism]?.abbr ?? 'BOX';
  }

  /** Rodzina prezentacyjna wynikająca z aktualnego mechanizmu. */
  get cornerFamily(): CornerFamily {
    return this.isCornerTypeB ? 'BLIND' : 'L';
  }

  isFamilySelected(family: CornerFamily): boolean {
    return this.cornerFamily === family;
  }

  /**
   * Klik karty rodziny (krok ①) ustawia pierwszy mechanizm danej rodziny:
   *  - L-kształt → FIXED_SHELVES, ślepy → BLIND_CORNER.
   * Pozostała logika (constraints, widoczność, parametry) odpala się w {@link onCornerMechanismChange}.
   */
  selectFamily(family: CornerFamily): void {
    if (this.isFamilySelected(family)) {
      return;
    }
    const target = family === 'BLIND' ? CornerMechanismType.BLIND_CORNER : CornerMechanismType.FIXED_SHELVES;
    this.form.patchValue({ cornerMechanism: target });
  }

  /**
   * Karty mechanizmów (krok ②) — wyłącznie systemy dedykowane wybranej rodzinie narożnika
   * (krok ①). L-kształt → mechanizmy Type A (FIXED_SHELVES / CAROUSEL_*), ślepy → Type B
   * (BLIND_CORNER / Magic / Le Mans). `availableCornerMechanisms` celowo trzyma pełną listę
   * (żeby dropdown nigdy nie był pusty), więc filtr po rodzinie robimy tutaj, w warstwie prezentacji.
   */
  get mechanismCards(): CornerMechanismCard[] {
    const current = this.currentCornerMechanism;
    const typeB = this.isCornerTypeB;
    return this.availableCornerMechanisms
      .filter(option => isBlindType(option.value) === typeB)
      .map(option => {
        const meta = CORNER_MECHANISM_META[option.value];
        return {
          value: option.value,
          label: option.label,
          abbr: meta.abbr,
          glyph: meta.glyph,
          desc: meta.desc,
          selected: option.value === current
        };
      });
  }

  selectMechanism(value: CornerMechanismType): void {
    if (value === this.currentCornerMechanism) {
      return;
    }
    this.form.patchValue({ cornerMechanism: value });
  }

  // ─────────────────────────── Podgląd (sticky, widok z góry) ───────────────────────────
  //
  // Schemat top-view w układzie viewBox 0 0 220 160 (jak prototyp handoff). Wszystkie wymiary
  // są mapowane przez clampMap() z zakresu realnego (mm) na zakres pikseli podglądu — podgląd jest
  // poglądowy (proporcjonalny), nie skalą 1:1. Lewy-górny narożnik korpusu = (PREVIEW_CX, *).

  private static readonly PREVIEW_CX = 34;

  private clampMap(value: number, vMin: number, vMax: number, oMin: number, oMax: number): number {
    const t = Math.max(0, Math.min(1, ((value || vMin) - vMin) / (vMax - vMin)));
    return oMin + t * (oMax - oMin);
  }

  /** Glif mechanizmu w podglądzie (półki / karuzela / fasolka). */
  get previewGlyph(): CornerMechanismGlyph {
    return CORNER_MECHANISM_META[this.currentCornerMechanism]?.glyph ?? 'shelves';
  }

  get previewCx(): number {
    return CornerFormComponent.PREVIEW_CX;
  }

  private get previewWidthA(): number {
    return Number(this.form.get('cornerWidthA')?.value) || (this.isCornerTypeB ? 1000 : 900);
  }

  private get previewWidthB(): number {
    return Number(this.form.get('cornerWidthB')?.value) || 900;
  }

  private get previewFrontY(): number {
    return Number(this.form.get('cornerFrontUchylnyWidthMm')?.value) || 500;
  }

  /** Czy aktywny front jest po prawej stronie (handedness RIGHT). */
  get previewFrontRight(): boolean {
    return this.form.get('cornerHandedness')?.value === CornerHandedness.RIGHT;
  }

  // — L-kształt (Type A): polygon + ramiona —
  get previewLArmA(): number {
    return this.clampMap(this.previewWidthA, 600, 1200, 96, 158);
  }

  get previewLArmB(): number {
    return this.clampMap(this.previewWidthB, 600, 1200, 70, 108);
  }

  readonly previewLCy = 26;
  readonly previewLBand = 40;

  get previewLPolygon(): string {
    const cx = this.previewCx;
    const cy = this.previewLCy;
    const sA = this.previewLArmA;
    const sB = this.previewLArmB;
    const band = this.previewLBand;
    return `${cx},${cy} ${cx + sA},${cy} ${cx + sA},${cy + band} `
      + `${cx + band},${cy + band} ${cx + band},${cy + sB} ${cx},${cy + sB}`;
  }

  /** Czy ramię B narożnika L jest ślepe (układ drzwi BLIND). */
  get previewLBlindArm(): boolean {
    return this.form.get('cornerOpeningType')?.value === 'BLIND';
  }

  // — Ślepy / prostokątny (Type B): korpus + front uchylny + ślepa część —
  readonly previewBlindCy = 40;
  readonly previewBlindH = 62;

  get previewBlindBodyW(): number {
    return this.clampMap(this.previewWidthA, 800, 1200, 110, 158);
  }

  get previewBlindFy(): number {
    return this.clampMap(this.previewFrontY, 400, 600, 30, 52);
  }

  /** Szerokość paska blendy narożnikowej (X) w podglądzie. */
  get previewBlindXb(): number {
    return Math.max(2, this.currentBlindPanelVisibleWidthMin / 4);
  }

  /** X lewej krawędzi aktywnego frontu uchylnego (mirror przy handedness RIGHT). */
  get previewBlindFrontX(): number {
    return this.previewFrontRight
      ? (this.previewCx + this.previewBlindBodyW - this.previewBlindFy)
      : this.previewCx;
  }

  /** X lewej krawędzi paska blendy narożnikowej (przy froncie). */
  get previewBlindStripX(): number {
    return this.previewFrontRight
      ? (this.previewBlindFrontX - this.previewBlindXb)
      : (this.previewBlindFrontX + this.previewBlindFy);
  }

  /** Szerokość ślepej (zasłoniętej) części korpusu. */
  get previewBlindHiddenW(): number {
    return Math.max(0, this.previewBlindBodyW - this.previewBlindFy - this.previewBlindXb);
  }

  /** X lewej krawędzi ślepej części (po przeciwnej stronie niż front). */
  get previewBlindHiddenX(): number {
    return this.previewFrontRight
      ? this.previewCx
      : (this.previewBlindFrontX + this.previewBlindFy + this.previewBlindXb);
  }

  /** X osi zawiasu aktywnego frontu (krawędź obrotu). */
  get previewBlindHingeX(): number {
    return this.previewFrontRight
      ? (this.previewCx + this.previewBlindBodyW - 1.5)
      : (this.previewCx + 1.5);
  }

  /** X środka etykiety „ślepa część". */
  get previewBlindHiddenLabelX(): number {
    return this.previewBlindHiddenX + this.previewBlindHiddenW / 2;
  }

  // — Środek glifu mechanizmu (różny dla L i Type B) —
  get previewGlyphCx(): number {
    return this.isCornerTypeB
      ? this.previewBlindFrontX + this.previewBlindFy / 2
      : this.previewCx + this.previewLBand / 2 + 2;
  }

  get previewGlyphCy(): number {
    return this.isCornerTypeB
      ? this.previewBlindCy + this.previewBlindH / 2
      : this.previewLCy + this.previewLBand / 2 + 2;
  }

  /** Krótkie podsumowanie wymiarów w stopce podglądu. */
  get previewSummary(): string {
    const a = Math.round(this.previewWidthA);
    return this.isCornerTypeB
      ? `${a} · Y${Math.round(this.previewFrontY)}`
      : `${a}×${Math.round(this.previewWidthB)}`;
  }

  // ─────────────────────────── Ostrzeżenia inline (pomocnicze) ───────────────────────────

  private fs1ExceedsFront(): boolean {
    const fs1 = Number(this.form.get('blindPanelVisibleWidthMm')?.value);
    const front = Number(this.form.get('cornerFrontUchylnyWidthMm')?.value);
    return Number.isFinite(fs1) && Number.isFinite(front) && fs1 >= front;
  }

  // ─────────────────────────── Ostrzeżenia inline (handoff §6) ───────────────────────────

  /**
   * Ostrzeżenia walidacji prezentowane w kontekście (pasek nad krokiem ①).
   * Mirror reguł walidatora (`effectiveFrontMinWidthMm`, `isCornerOpeningAngleValid`, FS1<front)
   * — sam przycisk „Dodaj szafkę" blokuje walidator formularza.
   */
  get cornerWarnings(): string[] {
    const warnings: string[] = [];
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    if (!mechanism) {
      return warnings;
    }

    if (this.isCornerTypeB) {
      const front = Number(this.form.get('cornerFrontUchylnyWidthMm')?.value);
      const min = this.currentFrontUchylnyMin;
      if (Number.isFinite(front) && front > 0 && front < min) {
        warnings.push(`Front uchylny za wąski dla tego systemu — min. ${min} mm.`);
      }
    }

    if (this.isSystemMechanism) {
      const angle = this.form.get('cornerOpeningAngleDeg')?.value;
      if (angle != null && !isCornerOpeningAngleValid(mechanism, Number(angle))) {
        if (isLeMans(mechanism)) {
          warnings.push(`Fasolka Le Mans wymaga min. 85° otwarcia (podano ${angle}°).`);
        } else {
          const max = mechanism === CornerMechanismType.MAGIC_CORNER_COMFORT ? 90 : 75;
          warnings.push(`Kąt otwarcia ${angle}° przekracza maks. ${max}° dla tego systemu.`);
        }
      }
    }

    if (this.isCornerTypeB && this.form.get('blindPanelSplitEnabled')?.value && this.fs1ExceedsFront()) {
      warnings.push('FS1 musi być węższe niż front uchylny.');
    }

    return warnings;
  }

  /** Czy aktualny mechanizm to Type B (Blind/Rectangular). */
  get isCornerTypeB(): boolean {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    return mechanism ? isBlindType(mechanism) : false;
  }

  /** Czy narożnik jest górny (wiszący). Type B (ślepy/Magic/Le Mans) jest zawsze dolny. */
  get isUpperCorner(): boolean {
    return this.form.get('isUpperCorner')?.value ?? false;
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
      // Type B: konstrukcja zawsze dolna w sensie wymiarów, ale wiszący ślepy narożnik (BLIND_CORNER)
      // jest dozwolony. Po zmianie montażu odśwież listę mechanizmów Type B: górny dopuszcza tylko
      // BLIND_CORNER (Magic/Le Mans nie mają wariantu wiszącego) → mechanismCards pokazuje wtedy 1 kartę.
      const typeBMechanisms = isUpper ? UPPER_CORNER_MECHANISMS : BASE_CORNER_MECHANISMS;
      this.availableCornerMechanisms = typeBMechanisms.map(m => ({
        value: m,
        label: CORNER_MECHANISM_LABELS[m]
      }));
      return;
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
    const wantsUpper = this.form.get('isUpperCorner')?.value ?? false;
    const isUpper = !typeB && wantsUpper;

    if (typeB) {
      // Wiszący ślepy narożnik: konstrukcja identyczna jak dolnego (depth 510, width 800–1200),
      // różni się tylko brakiem nóżek i opcjami szafki wiszącej (przedłużany front) → BLIND_CORNER_CONSTRAINTS.
      this.cornerConstraints = BLIND_CORNER_CONSTRAINTS;
      // BUG FIX (2026-05-24): wcześniej tutaj było `[]`, co powodowało że dropdown
      // mechanizmów był pusty i użytkownik nie mógł zmienić mechanizmu po wybraniu Le Mans/Magic/Blind.
      // Lista MUSI zawierać pełen zbiór mechanizmów, niezależnie od aktualnego wyboru.
      // Górny narożnik dopuszcza wśród Type B tylko BLIND_CORNER (Magic/Le Mans są dolne) →
      // UPPER_CORNER_MECHANISMS, dzięki czemu `mechanismCards` (krok ②) pokazuje jedynie ślepy narożnik.
      const typeBMechanisms = wantsUpper ? UPPER_CORNER_MECHANISMS : BASE_CORNER_MECHANISMS;
      this.availableCornerMechanisms = typeBMechanisms.map(m => ({
        value: m,
        label: CORNER_MECHANISM_LABELS[m]
      }));
      // Type B: depth zawsze 510mm (preparer wymusza po stronie backendu — patchujemy też FE dla spójności)
      this.form.patchValue({ depth: BLIND_CORNER_CONSTRAINTS.depth }, { emitEvent: false });
      // Strona narożnika (lewy/prawy) dotyczy WSZYSTKICH Type B (ślepy + Magic/Le Mans).
      // Domyślnie LEWA, jeśli nie ustawiono — zachowaj wartość w trybie edycji.
      if (this.form.get('cornerHandedness')?.value == null) {
        this.form.patchValue({ cornerHandedness: CornerHandedness.LEFT }, { emitEvent: false });
      }
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

    // Iter.6 (Faza 1): parametry systemowe (Magic Corner / Le Mans) renderowane w
    // app-corner-options-form (zakładka „Opcje"). Tutaj utrzymujemy tylko domenowe efekty uboczne.
    const systemMechanism = mechanism ? (isMagicCorner(mechanism) || isLeMans(mechanism)) : false;

    // CR-fix: Magic Corner Comfort nie obsługuje linii 400 (siatka producenta od 450) —
    // wyczyść nieaktualną wartość, jeśli była wybrana (filtrowanie dropdownu jest w options-form).
    const comfort = mechanism === CornerMechanismType.MAGIC_CORNER_COMFORT;
    if (comfort && this.form.get('cornerSystemLine')?.value === CornerSystemLine.LINE_400) {
      this.form.patchValue({ cornerSystemLine: null }, { emitEvent: false });
    }

    // B4 (2026-05-29): wreathConstructionType is Type A only.
    // Type B → clear (unikamy stale value w persistenceJson). Type A → domyślnie SPLIT_RECTANGLES
    // gdy puste (dropdown nie może być pusty), z zachowaniem zapisanej wartości w trybie edycji.
    if (typeB) {
      this.form.patchValue({ wreathConstructionType: null }, { emitEvent: false });
    } else if (this.form.get('wreathConstructionType')?.value == null) {
      this.form.patchValue(
        { wreathConstructionType: CornerWreathConstructionType.SPLIT_RECTANGLES },
        { emitEvent: false }
      );
    }

    // Strona narożnika (handedness) dotyczy wszystkich Type B; dla Type A zawsze null.
    if (!typeB) {
      this.form.patchValue({ cornerHandedness: null }, { emitEvent: false });
    }

    // Parametry stricte systemowe (kąt / grubość frontu / linia) tylko dla Magic Corner / Le Mans.
    // Pozostałe Type B (BLIND_CORNER) oraz Type A → wyczyść; systemy → wstaw domyślne z zakresów walidacji.
    if (!systemMechanism) {
      this.form.patchValue({
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

  /** trackBy dla list napisów (ostrzeżenia inline). */
  protected trackByString = (_: number, item: string) => item;
}
