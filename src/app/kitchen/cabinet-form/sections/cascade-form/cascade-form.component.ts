import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { merge } from 'rxjs';
import { UpperCascadeCabinetPreparer } from '../../types/upper-cascade/upper-cascade-cabinet-preparer';
import { UpperCascadeCabinetValidator } from '../../types/upper-cascade/upper-cascade-cabinet-validator';
import { FormFieldComponent } from '../../../../shared/form-field/form-field.component';
import { getFormError } from '../../../../shared/form-error.util';

/**
 * Sekcja konfiguracji szafki kaskadowej (UPPER_CASCADE).
 * Zarządza segmentami kaskadowymi (wysokość, głębokość, opcje frontu).
 * Odbiera współdzielony FormGroup od parenta.
 */
@Component({
  selector: 'app-cascade-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent],
  templateUrl: './cascade-form.component.html',
  styleUrls: ['./cascade-form.component.css']
})
export class CascadeFormComponent implements OnInit {

  @Input() form!: FormGroup;

  private destroyRef = inject(DestroyRef);
  private cascadeValidator = new UpperCascadeCabinetValidator();
  private cascadePreparer = new UpperCascadeCabinetPreparer();

  ngOnInit(): void {
    // Reaguj na zmiany wymiarów segmentów (input event = na każde naciśnięcie klawisza)
    const cascadeFields = ['cascadeLowerHeight', 'cascadeLowerDepth', 'cascadeUpperHeight', 'cascadeUpperDepth'];
    const observables = cascadeFields
      .map(f => this.form.get(f)?.valueChanges)
      .filter(obs => obs != null) as any[];

    merge(...observables)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cascadePreparer.recalculateDimensions(this.form));
  }

  /** Całkowita wysokość szafki kaskadowej (suma obu segmentów). */
  get cascadeTotalHeight(): number {
    const lower = this.form.get('cascadeLowerHeight')?.value ?? 0;
    const upper = this.form.get('cascadeUpperHeight')?.value ?? 0;
    return lower + upper;
  }

  /** Błąd kolejności głębokości segmentów (dolny musi być płytszy niż górny). */
  get cascadeDepthError(): string | null {
    return this.cascadeValidator.getDepthOrderError(this.form);
  }

  getFieldError(controlName: string): string | null {
    return getFormError(this.form.get(controlName));
  }
}
