import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DictionaryService } from '../../../service/dictionary.service';
import { SectionHeaderComponent } from '../../shared/section-header.component';
import { KitchenCabinetConstraints } from '../../model/kitchen-cabinet-constants';

/**
 * Sekcja konfiguracji szafki na wbudowany piekarnik (BASE_OVEN).
 * Zarządza typem wnęki, sekcją dolną, systemem szuflady niskiej i blendą.
 * Odbiera współdzielony FormGroup od parenta.
 */
@Component({
  selector: 'app-oven-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, SectionHeaderComponent],
  templateUrl: './oven-form.component.html',
  styleUrls: ['./oven-form.component.css']
})
export class OvenFormComponent implements OnInit {

  @Input() form!: FormGroup;

  /** Czy widoczny jest selector systemu szuflady niskiej. */
  showOvenDrawerModel = false;
  /** Czy widoczne jest pole wysokości blendy dekoracyjnej. */
  showOvenApronHeight = false;

  private destroyRef = inject(DestroyRef);

  constructor(readonly dictionaryService: DictionaryService) {}

  ngOnInit(): void {
    // Inicjalizacja ze stanu kontrolek
    this.showOvenDrawerModel = this.form.get('drawerModel')?.enabled ?? false;
    this.showOvenApronHeight = this.form.get('ovenApronHeightMm')?.enabled ?? false;

    // Reaguj na zmianę sekcji dolnej
    this.form.get('ovenLowerSectionType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => this.onOvenLowerSectionTypeChange(type));

    // Reaguj na zmianę checkboxa blendy
    this.form.get('ovenApronEnabled')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(enabled => this.onOvenApronEnabledChange(!!enabled));
  }

  /** Czy blenda dekoracyjna nad piekarnikiem jest włączona. */
  get isOvenApronEnabled(): boolean {
    return this.form.get('ovenApronEnabled')?.value === true;
  }

  /** Sugerowane szerokości szafki na piekarnik wg kitchen-cabinet-constants (BASE_OVEN.SUGGESTED_WIDTHS_MM). */
  readonly suggestedOvenWidthsMm: readonly number[] = KitchenCabinetConstraints.BASE_OVEN.SUGGESTED_WIDTHS_MM;

  /**
   * Komunikat ostrzegawczy gdy szerokość szafki na piekarnik odbiega od standardowych 600/700mm.
   * Zwraca null gdy szerokość pasuje (lub gdy pole jest puste).
   */
  get ovenCabinetWidthWarning(): string | null {
    const w = Number(this.form.get('width')?.value);
    if (!w || isNaN(w)) return null;
    if (this.suggestedOvenWidthsMm.includes(w)) return null;
    return `Szerokosc szafki ${w}mm odbiega od standardowych szerokosci piekarnikow `
      + `(${this.suggestedOvenWidthsMm.join('mm lub ')}mm). `
      + `Sprawdz wymiar piekarnika ktory ma sie zmiescic w szafce.`;
  }

  private onOvenLowerSectionTypeChange(sectionType: string): void {
    const isLowDrawer = sectionType === 'LOW_DRAWER';
    this.showOvenDrawerModel = isLowDrawer;
    const ctrl = this.form.get('drawerModel');
    if (ctrl) {
      if (isLowDrawer) {
        ctrl.enable();
        if (!ctrl.value) ctrl.setValue('ANTARO_TANDEMBOX');
      } else {
        ctrl.setValue(null);
        ctrl.disable();
      }
    }
  }

  private onOvenApronEnabledChange(enabled: boolean): void {
    this.showOvenApronHeight = enabled;
    const ctrl = this.form.get('ovenApronHeightMm');
    if (ctrl) enabled ? ctrl.enable() : ctrl.disable();
  }

  protected trackByCode = (_: number, item: { code: string }) => item.code;
}
