import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DictionaryService } from '../../../service/dictionary.service';
import { SectionHeaderComponent } from '../../shared/section-header.component';

/**
 * Sekcja konfiguracji szafki pod płytę grzewczą (BASE_COOKTOP).
 * Zarządza typem płyty, typem frontu i opcjami szuflad.
 * Odbiera współdzielony FormGroup od parenta.
 */
@Component({
  selector: 'app-cooktop-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, SectionHeaderComponent],
  templateUrl: './cooktop-form.component.html',
  styleUrls: ['./cooktop-form.component.css']
})
export class CooktopFormComponent implements OnInit {

  @Input() form!: FormGroup;

  /** Czy widoczna jest sekcja szuflad (frontType=DRAWERS). */
  showDrawerOptions = false;

  private destroyRef = inject(DestroyRef);

  constructor(readonly dictionaryService: DictionaryService) {}

  ngOnInit(): void {
    // Inicjalizacja — szuflady widoczne gdy drawerQuantity enabled
    this.showDrawerOptions = this.form.get('drawerQuantity')?.enabled ?? false;

    // Reaguj na zmianę typu frontu
    this.form.get('cooktopFrontType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(frontType => this.onCooktopFrontTypeChange(frontType));
  }

  /** Czy wybrany front to szuflady. */
  get isCooktopDrawers(): boolean {
    return this.form.get('cooktopFrontType')?.value === 'DRAWERS';
  }

  /** Czy wybrana płyta to gazowa. */
  get isGasCooktop(): boolean {
    return this.form.get('cooktopType')?.value === 'GAS';
  }

  private onCooktopFrontTypeChange(frontType: string): void {
    const isDrawers = frontType === 'DRAWERS';
    this.showDrawerOptions = isDrawers;
    const qtyCtrl = this.form.get('drawerQuantity');
    const modelCtrl = this.form.get('drawerModel');
    if (qtyCtrl) isDrawers ? qtyCtrl.enable() : qtyCtrl.disable();
    if (modelCtrl) isDrawers ? modelCtrl.enable() : modelCtrl.disable();
  }

  protected trackByCode = (_: number, item: { code: string }) => item.code;
}
