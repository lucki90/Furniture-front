import { Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Sekcja konfiguracji szafki zlewowej (BASE_SINK).
 * Zarządza typem frontu, blendą maskującą i systemem szuflad.
 * Odbiera współdzielony FormGroup od parenta.
 */
@Component({
  selector: 'app-sink-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
  }

  private onSinkApronEnabledChange(enabled: boolean): void {
    this.showSinkApronHeight = enabled;
  }
}
