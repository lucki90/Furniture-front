import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  CORNER_MECHANISM_LABELS,
  CornerMechanismType,
  isBlindType
} from '../../model/corner-cabinet.model';

/**
 * Podgląd SVG szafki narożnej — wydzielony z `corner-form` (Iteracja 3 poprawka 2026-05-24).
 *
 * <p>Zgodnie z UX request:</p>
 * <ul>
 *   <li>Cała konfiguracja narożnika (`corner-form`) jest w zakładce "Podstawowe"</li>
 *   <li>Podgląd SVG jest w zakładce "Opcje" jako jedyna treść</li>
 * </ul>
 *
 * <p>Pełna wizualizacja kształtu (Type A L-shape + Type B z FS1/FS2/blendami + kierunek otwarcia drzwi)
 * jest planowana w Iteracji 6 (VIZ-CORNER-TOP, VIZ-CORNER-FRONT).</p>
 */
@Component({
  selector: 'app-corner-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './corner-preview.component.html',
  styleUrls: ['./corner-preview.component.css']
})
export class CornerPreviewComponent {

  @Input() form!: FormGroup;

  readonly cornerMechanismLabels = CORNER_MECHANISM_LABELS;

  /** Czy aktualny mechanizm to Type B (Blind/Rectangular). */
  get isCornerTypeB(): boolean {
    const mechanism = this.form.get('cornerMechanism')?.value as CornerMechanismType;
    return mechanism ? isBlindType(mechanism) : false;
  }

  /** Aktualnie wybrany mechanizm. */
  get currentCornerMechanism(): CornerMechanismType {
    return this.form.get('cornerMechanism')?.value ?? CornerMechanismType.FIXED_SHELVES;
  }

  /** Etykieta aktualnego mechanizmu. */
  get currentCornerMechanismLabel(): string {
    return this.cornerMechanismLabels[this.currentCornerMechanism] ?? '';
  }
}
