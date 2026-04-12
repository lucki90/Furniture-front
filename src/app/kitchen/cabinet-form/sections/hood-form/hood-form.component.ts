import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DictionaryService } from '../../../service/dictionary.service';

/**
 * Sekcja konfiguracji szafki wiszącej na okap (UPPER_HOOD).
 * Zarządza typem frontu i opcjonalną blendą wewnętrzną.
 * Odbiera współdzielony FormGroup od parenta.
 */
@Component({
  selector: 'app-hood-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './hood-form.component.html',
  styleUrls: ['./hood-form.component.css']
})
export class HoodFormComponent implements OnInit {

  @Input() form!: FormGroup;

  /** Czy pole wysokości blendy wewnętrznej jest widoczne. */
  showHoodScreenHeight = false;

  private destroyRef = inject(DestroyRef);

  constructor(readonly dictionaryService: DictionaryService) {}

  ngOnInit(): void {
    // Inicjalizacja na podstawie aktualnego stanu kontrolki
    this.showHoodScreenHeight = this.form.get('hoodScreenHeightMm')?.enabled ?? false;

    // Reaguj na zmianę checkboxa blendy wewnętrznej
    this.form.get('hoodScreenEnabled')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(enabled => this.onHoodScreenEnabledChange(!!enabled));
  }

  private onHoodScreenEnabledChange(enabled: boolean): void {
    this.showHoodScreenHeight = enabled;
    const ctrl = this.form.get('hoodScreenHeightMm');
    if (ctrl) enabled ? ctrl.enable() : ctrl.disable();
  }

  protected trackByCode = (_: number, item: { code: string }) => item.code;
}
