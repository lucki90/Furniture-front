import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormFieldComponent } from '../../../../shared/form-field/form-field.component';
import { getFormError } from '../../../../shared/form-error.util';
import {
  BASE_CORNER_CONSTRAINTS,
  BLIND_CORNER_CONSTRAINTS,
  CORNER_HANDLE_FILLER_WIDTH_MM,
  CornerHandleType,
  CornerMechanismType,
  UPPER_CORNER_CONSTRAINTS,
  computeBlindCornerWidthFromFormula,
  isBlindType
} from '../../model/corner-cabinet.model';

/**
 * Wymiary szafki narożnej (cornerWidthA, cornerWidthB, height, depth).
 *
 * <p>Wydzielone jako osobny sub-komponent z `corner-form`, aby wymiary mogły żyć w zakładce "Podstawowe"
 * (zgodnie z UX request 2026-05-24: typ szafki + jego wymiary muszą być w pierwszej zakładce),
 * a `corner-form` w zakładce "Opcje" obsługiwał wyłącznie ustawienia konstrukcyjne (mechanizm, typ otwarcia,
 * blendy, split FS1+FS2, półki, podgląd SVG).</p>
 *
 * <p>Constraints (min/max/step) są wyliczane reaktywnie na podstawie aktualnego mechanizmu i flagi `isUpperCorner`
 * — getter `cornerConstraints` zwraca odpowiedni zestaw (BASE_CORNER / UPPER_CORNER / BLIND_CORNER).</p>
 */
@Component({
  selector: 'app-corner-dimensions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent],
  templateUrl: './corner-dimensions.component.html',
  styleUrls: ['./corner-dimensions.component.css']
})
export class CornerDimensionsComponent {

  @Input() form!: FormGroup;

  /** Czy aktualny mechanizm to Type B (Blind/Rectangular). */
  get isCornerTypeB(): boolean {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    return mechanism ? isBlindType(mechanism) : false;
  }

  // gettery `currentCornerMechanism` / `currentCornerMechanismLabel` przeniesione do osobnego
  // sub-komponentu `corner-preview` (zakładka "Opcje", Iteracja 3 poprawka 2026-05-24).

  /** Czy szafka narożna jest górną (wisząca). */
  get isUpperCorner(): boolean {
    return !this.isCornerTypeB && (this.form.get('isUpperCorner')?.value ?? false);
  }

  /** Reaktywne constraints — zmieniają się gdy user zmienia mechanizm albo isUpperCorner. */
  get cornerConstraints() {
    if (this.isCornerTypeB) return BLIND_CORNER_CONSTRAINTS;
    return this.isUpperCorner ? UPPER_CORNER_CONSTRAINTS : BASE_CORNER_CONSTRAINTS;
  }

  /** Czy pole "Szerokość B" widoczne (tylko Type A — Type B ma jedno widthA). */
  get showWidthB(): boolean {
    return !this.isCornerTypeB;
  }

  /** Czy "Głębokość" ma być readonly (zawsze dla dolnej — 510mm dla Type A i Type B). */
  get isDepthReadonly(): boolean {
    return !this.isUpperCorner;
  }

  /** Hint dla pola "Głębokość". */
  get depthHint(): string {
    if (this.isDepthReadonly) {
      return 'Stała głębokość 510 mm (spójna z resztą szafek dolnych)';
    }
    return '300–350 mm';
  }

  /**
   * Sugerowana szerokość szafki ślepej (widthA) — wzór z książki str. 169:
   *   S = 580 - 50 + X + Y + 4
   * Zwraca null gdy nie Type B / dane formularza niekompletne.
   */
  get suggestedBlindCornerWidth(): { value: number; tooltipText: string; formulaText: string } | null {
    if (!this.isCornerTypeB) return null;
    const handle = (this.form.get('cornerHandleType')?.value ?? CornerHandleType.SCREWED) as CornerHandleType;
    const y = Number(this.form.get('cornerFrontUchylnyWidthMm')?.value);
    if (!Number.isFinite(y) || y <= 0) return null;
    const x = CORNER_HANDLE_FILLER_WIDTH_MM[handle];
    const value = computeBlindCornerWidthFromFormula(handle, y);
    const formulaText = `S = 580 - 50 + ${x} (X) + ${y} (Y) + 4 = ${value} mm`;
    const tooltipText =
      `Wzór z książki Wasiak v.2.3 str. 169 (sekcja 6):\n\n` +
      `${formulaText}\n\n` +
      `gdzie:\n` +
      `  580 mm — stała odległość czoła frontu od ściany (50mm odstęp + 510mm głębokość sąsiedniej szafki + 20mm grubość frontu)\n` +
      `  X (${x} mm) — szerokość blendy narożnikowej zależna od typu uchwytu\n` +
      `  Y (${y} mm) — szerokość frontu uchylnego\n` +
      `  +4 mm — tolerancja na szczeliny`;
    return { value, tooltipText, formulaText };
  }

  /** Zastosuj sugerowaną szerokość (klik na link). */
  applySuggestedWidth(): void {
    const suggested = this.suggestedBlindCornerWidth;
    if (!suggested) return;
    const clamped = Math.max(BLIND_CORNER_CONSTRAINTS.widthMin,
      Math.min(suggested.value, BLIND_CORNER_CONSTRAINTS.widthMax));
    this.form.patchValue({ cornerWidthA: clamped });
  }

  getFieldError(controlName: string): string | null {
    return getFormError(this.form.get(controlName));
  }
}
