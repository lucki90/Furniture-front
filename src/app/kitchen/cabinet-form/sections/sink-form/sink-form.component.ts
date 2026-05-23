import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormFieldComponent } from '../../../../shared/form-field/form-field.component';
import { getFormError } from '../../../../shared/form-error.util';
import { DictionaryService } from '../../../service/dictionary.service';
import { SectionHeaderComponent } from '../../shared/section-header.component';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';

/**
 * Sekcja konfiguracji szafki zlewowej (BASE_SINK).
 * Zarządza typem frontu, blendą maskującą i systemem szuflad.
 * Odbiera współdzielony FormGroup od parenta.
 */
@Component({
  selector: 'app-sink-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent, SectionHeaderComponent],
  templateUrl: './sink-form.component.html',
  styleUrls: ['./sink-form.component.css']
})
export class SinkFormComponent implements OnInit {

  @Input() form!: FormGroup;

  /** Sekcja blendy maskującej — zawsze widoczna dla BASE_SINK. */
  showSinkApron = true;
  /** Pole wysokości blendy — widoczne gdy apronEnabled=true. */
  showSinkApronHeight = false;
  /** Selector systemu szuflad — widoczny gdy frontType=DRAWER. */
  showSinkDrawerModel = false;

  private destroyRef = inject(DestroyRef);

  constructor(readonly dictionaryService: DictionaryService) {}

  ngOnInit(): void {
    // Inicjalizacja na podstawie aktualnego stanu kontrolek
    this.showSinkApronHeight = this.form.get('sinkApronHeightMm')?.enabled ?? false;
    this.showSinkDrawerModel = this.form.get('sinkDrawerModel')?.enabled ?? false;

    // Reaguj na zmianę typu frontu
    this.form.get('sinkFrontType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(frontType => this.onSinkFrontTypeChange(frontType));

    // Reaguj na zmianę checkboxa blendy
    this.form.get('sinkApronEnabled')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(enabled => this.onSinkApronEnabledChange(!!enabled));
  }

  /** Czy wybrany front to szuflada — wpływa na etykietę informacyjną. */
  get isSinkDrawer(): boolean {
    return this.form.get('sinkFrontType')?.value === 'DRAWER';
  }

  /** Czy blenda maskująca jest włączona. */
  get isSinkApronEnabled(): boolean {
    return this.form.get('sinkApronEnabled')?.value === true;
  }

  /** Szerokość wnętrza korpusu: width − 2 × 18 mm boku. */
  get innerCabinetWidth(): number {
    const w = this.form.get('width')?.value ?? 0;
    return w - 2 * 18;
  }

  private onSinkFrontTypeChange(frontType: string): void {
    const isDrawer = frontType === 'DRAWER';
    this.showSinkDrawerModel = isDrawer;
    const ctrl = this.form.get('sinkDrawerModel');
    if (ctrl) isDrawer ? ctrl.enable() : ctrl.disable();

    // Re-apply width validators — zakres szerokości zależy od front-type (książka str. 41)
    this.refreshWidthValidators(frontType);
  }

  /**
   * Aktualizuje Validators pola `width` zgodnie z wybranym sinkFrontType.
   * Zakresy z `KitchenCabinetConstraints.BASE_SINK` (książka Wasiak v.2.3 str. 41).
   */
  private refreshWidthValidators(sinkFrontType: string | null | undefined): void {
    const c = KitchenCabinetConstraints.BASE_SINK;
    let min: number;
    let max: number;
    switch (sinkFrontType) {
      case 'ONE_DOOR':
        min = c.WIDTH_ONE_DOOR_MIN; max = c.WIDTH_ONE_DOOR_MAX; break;
      case 'TWO_DOORS':
        min = c.WIDTH_TWO_DOORS_MIN; max = c.WIDTH_TWO_DOORS_MAX; break;
      case 'DRAWER':
        min = c.WIDTH_DRAWER_MIN; max = c.WIDTH_DRAWER_MAX; break;
      default:
        min = c.WIDTH_MIN; max = c.WIDTH_MAX;
    }
    const widthCtrl = this.form.get('width');
    widthCtrl?.setValidators([Validators.required, Validators.min(min), Validators.max(max)]);
    widthCtrl?.updateValueAndValidity();
  }

  private onSinkApronEnabledChange(enabled: boolean): void {
    this.showSinkApronHeight = enabled;
  }

  getFieldError(controlName: string): string | null {
    return getFormError(this.form.get(controlName));
  }

  protected trackByCode = (_: number, item: { code: string }) => item.code;
}
