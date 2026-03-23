import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reużywalny wrapper pola formularza.
 * Opakowuje label + ng-content (input/select) + opcjonalną jednostkę + błąd + podpowiedź.
 *
 * Użycie:
 *   <app-form-field label="Szerokość (mm)" [errorMessage]="errors.width" hint="450–900 mm">
 *     <input class="form-control" type="number" formControlName="width">
 *   </app-form-field>
 *
 *   Z jednostką:
 *   <app-form-field label="Wysokość" unit="mm" [errorMessage]="errors.height">
 *     <input class="form-control" type="number" formControlName="height">
 *   </app-form-field>
 */
@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-field.component.html',
  styleUrls: ['./form-field.component.css']
})
export class FormFieldComponent {
  /** Etykieta pola — wyświetlana nad inputem. */
  @Input() label?: string;

  /** Podpowiedź — wyświetlana pod inputem gdy brak błędu. */
  @Input() hint?: string;

  /** Komunikat błędu — gdy podany, wyświetlany zamiast hint; null/undefined = brak błędu. */
  @Input() errorMessage?: string | null;

  /** Jednostka wyświetlana po prawej stronie inputa (np. 'mm', 'szt.'). */
  @Input() unit?: string;
}
