import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Sekcja konfiguracji szafki na wbudowany piekarnik (BASE_OVEN).
 * Zarządza typem wnęki, sekcją dolną, systemem szuflady niskiej i blendą.
 * Odbiera współdzielony FormGroup od parenta.
 */
@Component({
  selector: 'app-oven-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
}
