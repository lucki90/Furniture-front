import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CornerMechanismType,
  CornerHandleType,
  CORNER_HANDLE_FILLER_WIDTH_MM,
  CornerSystemLine,
  CORNER_SYSTEM_LINE_LABELS,
  isBlindType,
  isMagicCorner,
  isLeMans
} from '../../model/corner-cabinet.model';
import { KitchenCabinetType } from '../../model/kitchen-cabinet-type';
import { KitchenCabinetTypeConfig } from '../../type-config/kitchen-cabinet-type-config';
import { FormFieldComponent } from '../../../../shared/form-field/form-field.component';
import { CabinetFormValidationErrorsService } from '../../cabinet-form-validation-errors.service';

/**
 * Sekcja „Zaawansowane" narożnika (CORNER_CABINET) — zakładka „Opcje".
 *
 * Parametry systemowe (Magic Corner / Le Mans) oraz podział frontu ślepego FS1+FS2 (Type B).
 * Przeniesione z zakładki „Podstawowe" (corner-form) na życzenie usera (UX 2026-06-01) —
 * tu są zawsze widoczne (bez zwijania). Odbiera współdzielony FormGroup od parenta.
 *
 * Uwaga: domyślne wartości systemowe i filtr linii LINE_400 (Magic Comfort) są ustawiane
 * w {@link CornerFormComponent.onCornerMechanismChange} (zakładka „Podstawowe"), gdzie
 * wybiera się mechanizm. Tutaj odtwarzamy tylko filtr dropdownu i lokalną rewalidację.
 */
@Component({
  selector: 'app-corner-options-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent],
  templateUrl: './corner-options-form.component.html',
  styleUrls: ['./corner-options-form.component.css']
})
export class CornerOptionsFormComponent implements OnInit {

  @Input() form!: FormGroup;

  private destroyRef = inject(DestroyRef);
  private readonly validationErrorsService = inject(CabinetFormValidationErrorsService);

  /** Pełna lista linii systemowych (źródło dla filtrowanej listy per mechanizm). */
  private readonly allCornerSystemLineOptions = Object.values(CornerSystemLine).map(value => ({
    value,
    label: CORNER_SYSTEM_LINE_LABELS[value]
  }));

  /** Tooltip dla podziału frontu ślepego FS1+FS2 (książka Wasiak v.2.3 str. 169). */
  readonly blindSplitTooltip =
    'Książka Wasiak v.2.3 str. 169:\n\n'
    + 'Front ślepy (FS) ma ~580mm, z czego widoczne jest tylko ~50mm jako blenda — '
    + 'reszta chowa się za sąsiednią szafką w narożniku.\n\n'
    + 'Podział na 2 elementy oszczędza ~75% drogiego materiału frontu (MDF lakier / RAL / fornir):\n'
    + '  • FS1 — widoczna część (np. 150mm) z materiału frontu\n'
    + '  • FS2 — ukryta część (reszta) z materiału korpusu (płyta laminowana)\n\n'
    + 'Włącz dla lakierowanych / drogich frontów. Pomiń dla okleinowanych (taka sama cena).';

  ngOnInit(): void {
    // Rewalidacja przy zmianie pól wpływających na walidatory (gdy użytkownik jest na zakładce „Opcje",
    // corner-form jest zniszczony, więc jego subskrypcje nie działają — potrzebujemy własnych).
    this.form.get('blindPanelSplitEnabled')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.revalidate());
    this.form.get('cornerSystemLine')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.revalidate());
  }

  /** Czy sekcja ma jakąkolwiek zawartość (ślepy front lub system Magic/Le Mans). */
  get hasCornerOptions(): boolean {
    return this.isCornerTypeB || this.showSystemParams;
  }

  /** Czy aktualny mechanizm to Type B (Blind/Rectangular). */
  get isCornerTypeB(): boolean {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    return mechanism ? isBlindType(mechanism) : false;
  }

  /** Czy mechanizm to jednostronny system z parametrami (Magic Corner / Le Mans). */
  get showSystemParams(): boolean {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    return mechanism ? (isMagicCorner(mechanism) || isLeMans(mechanism)) : false;
  }

  /**
   * Opcje dropdown „Linia systemu" filtrowane per mechanizm. Magic Corner Comfort nie obsługuje
   * LINE_400 (siatka producenta od 450) — wartość jest też czyszczona w corner-form.
   */
  get cornerSystemLineOptions(): { value: CornerSystemLine; label: string }[] {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    return mechanism === CornerMechanismType.MAGIC_CORNER_COMFORT
      ? this.allCornerSystemLineOptions.filter(opt => opt.value !== CornerSystemLine.LINE_400)
      : this.allCornerSystemLineOptions;
  }

  /**
   * Podpowiedź pod „Linią systemu". Dla Le Mans linia NIE wpływa na wymiary (Y-min frontu jest stałe =
   * 400 mm niezależnie od linii); jest wtedy wyłącznie metadaną zamówieniową dla producenta. Dla Magic
   * Corner linia wyznacza min. szerokość frontu (Y-min). (P3 CR — odróżnienie parametru od metadanej.)
   */
  get cornerSystemLineHint(): string {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    return mechanism && isLeMans(mechanism)
      ? 'Dla Le Mans linia jest tylko informacją dla producenta — nie wpływa na wymiary frontu.'
      : 'Linia wyznacza min. szerokość frontu (Y-min) dla Magic Corner.';
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

  /**
   * Soft warning (FE-only, NIE blokuje) dla Magic Corner Standard z linią LINE_600:
   * producent wymaga korpusu ≥ 730 mm dla frontu 600 mm (książka/ref. §12).
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

  /** Minimalna szerokość widocznej części (FS1) — zależna od typu uchwytu (blenda narożnikowa X). */
  get currentBlindPanelVisibleWidthMin(): number {
    const handleType = (this.form.get('cornerHandleType')?.value ?? CornerHandleType.SCREWED) as CornerHandleType;
    return CORNER_HANDLE_FILLER_WIDTH_MM[handleType];
  }

  getFieldError(controlName: string): string | null {
    return this.validationErrorsService.getControlError(this.form.get(controlName));
  }

  private revalidate(): void {
    const type = this.form.get('kitchenCabinetType')?.value as KitchenCabinetType;
    if (type === KitchenCabinetType.CORNER_CABINET) {
      const config = KitchenCabinetTypeConfig[type];
      if (config) config.validator.validate(this.form);
    }
  }

  protected trackByValue = (_: number, item: { value: string }) => item.value;
}
