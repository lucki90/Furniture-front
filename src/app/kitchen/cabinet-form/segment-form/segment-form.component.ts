import { Component, DestroyRef, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  SegmentType,
  SEGMENT_TYPE_OPTIONS,
  DOOR_FRONT_TYPE_OPTIONS,
  SegmentFrontType,
  OVEN_SLOT_HEIGHT_MM,
  OvenSegmentHeightType
} from '../model/segment.model';
import { KitchenCabinetConstraints } from '../model/kitchen-cabinet-constants';
import { FormFieldComponent } from '../../../shared/form-field/form-field.component';
import { CabinetFormValidationErrorsService } from '../cabinet-form-validation-errors.service';

/**
 * Komponent formularza pojedynczego segmentu.
 * Wyświetla opcje zależne od typu segmentu (szuflady, drzwi, otwarte półki).
 */
@Component({
  selector: 'app-segment-form',
  templateUrl: './segment-form.component.html',
  styleUrls: ['./segment-form.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormFieldComponent]
})
export class SegmentFormComponent implements OnInit {

  @Input() segmentForm!: FormGroup;
  @Input() segmentIndex!: number;

  private readonly destroyRef = inject(DestroyRef);
  private readonly validationErrors = inject(CabinetFormValidationErrorsService);

  @Output() remove = new EventEmitter<void>();

  @Input() segmentTypeOptions = SEGMENT_TYPE_OPTIONS;
  readonly doorFrontTypeOptions = DOOR_FRONT_TYPE_OPTIONS;
  readonly constraints = KitchenCabinetConstraints.TALL_CABINET;

  readonly drawerModels = [
    { value: 'ANTARO_TANDEMBOX', label: 'Blum Antaro Tandembox' },
    { value: 'SEVROLL_BALL', label: 'Sevroll Ball' }
  ];

  ngOnInit(): void {
    // Nasłuchuj zmian typu segmentu — takeUntilDestroyed zapobiega wyciekom
    // gdy segment jest dodawany/usuwany dynamicznie (*ngFor w cabinet-form)
    this.segmentForm.get('segmentType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => {
        this.onSegmentTypeChange(type);
      });
  }

  get segmentType(): SegmentType | null {
    return this.segmentForm.get('segmentType')?.value;
  }

  get isDrawerSegment(): boolean {
    return this.segmentType === SegmentType.DRAWER;
  }

  get isDoorSegment(): boolean {
    return this.segmentType === SegmentType.DOOR;
  }

  get isOpenShelfSegment(): boolean {
    return this.segmentType === SegmentType.OPEN_SHELF;
  }

  get isOvenSegment(): boolean {
    return this.segmentType === SegmentType.OVEN;
  }

  get isMicrowaveSegment(): boolean {
    return this.segmentType === SegmentType.MICROWAVE;
  }

  /** Wnęki AGD (piekarnik, mikro) — tylko wysokość, bez opcji dodatkowych */
  get isApplianceSlot(): boolean {
    return this.isOvenSegment || this.isMicrowaveSegment;
  }

  /** Opcje typu wnęki piekarnika (dla OVEN). */
  readonly ovenHeightTypeOptions: { value: OvenSegmentHeightType; label: string; slotMm: number }[] = [
    { value: 'STANDARD', label: 'Standardowy (wneka 600mm)', slotMm: OVEN_SLOT_HEIGHT_MM.STANDARD },
    { value: 'COMPACT', label: 'Kompaktowy (wneka 455mm)', slotMm: OVEN_SLOT_HEIGHT_MM.COMPACT }
  ];

  /**
   * Komunikat ostrzegawczy dot. szerokosci szafki slupkowej dla segmentu OVEN.
   * Bazuje na wartosci kontrolki 'width' z PARENT formularza (przekazywanej przez @Input).
   * Zwraca null gdy szerokosc jest standardowa (600/700mm) lub gdy segment nie jest OVEN.
   */
  @Input() cabinetWidthMm: number | null = null;

  readonly suggestedOvenCabinetWidthsMm: readonly number[] = [600, 700];

  get ovenCabinetWidthWarning(): string | null {
    if (!this.isOvenSegment) return null;
    const w = this.cabinetWidthMm;
    if (w == null) return null;
    if (this.suggestedOvenCabinetWidthsMm.includes(w)) return null;
    return `Szerokosc slupka ${w}mm odbiega od standardowych szerokosci piekarnikow `
      + `(${this.suggestedOvenCabinetWidthsMm.join('mm lub ')}mm). `
      + `Sprawdz wymiar piekarnika ktory ma sie zmiescic w slupku.`;
  }

  get showShelfQuantity(): boolean {
    return this.isDoorSegment || this.isOpenShelfSegment;
  }

  get showDrawerOptions(): boolean {
    return this.isDrawerSegment;
  }

  get showFrontTypeOptions(): boolean {
    return this.isDoorSegment;
  }

  /**
   * Reakcja na zmianę typu segmentu - ustawia domyślne wartości.
   */
  private onSegmentTypeChange(type: SegmentType): void {
    switch (type) {
      case SegmentType.DRAWER:
        this.segmentForm.patchValue({
          drawerQuantity: this.segmentForm.get('drawerQuantity')?.value ?? 3,
          drawerModel: this.segmentForm.get('drawerModel')?.value ?? 'ANTARO_TANDEMBOX',
          shelfQuantity: null,
          frontType: 'DRAWER'
        });
        break;

      case SegmentType.DOOR:
        this.segmentForm.patchValue({
          drawerQuantity: null,
          drawerModel: null,
          shelfQuantity: this.segmentForm.get('shelfQuantity')?.value ?? 0,
          frontType: this.segmentForm.get('frontType')?.value ?? SegmentFrontType.ONE_DOOR
        });
        break;

      case SegmentType.OPEN_SHELF:
        this.segmentForm.patchValue({
          drawerQuantity: null,
          drawerModel: null,
          shelfQuantity: this.segmentForm.get('shelfQuantity')?.value ?? 0,
          frontType: 'OPEN'
        });
        break;

      case SegmentType.OVEN:
        // Wnęka piekarnika — bez szuflad, bez półek, bez frontu
        this.segmentForm.patchValue({
          drawerQuantity: null,
          drawerModel: null,
          shelfQuantity: 0,
          frontType: 'OPEN',
          // Domyślny typ wnęki — STANDARD (jeśli nie ustawiony)
          ovenHeightType: this.segmentForm.get('ovenHeightType')?.value ?? 'STANDARD'
        });
        break;

      case SegmentType.MICROWAVE:
        // Wnęka mikrofalówki — bez szuflad, bez półek, bez frontu, bez typu wnęki
        this.segmentForm.patchValue({
          drawerQuantity: null,
          drawerModel: null,
          shelfQuantity: 0,
          frontType: 'OPEN',
          ovenHeightType: null
        });
        break;
    }
  }

  onRemove(): void {
    this.remove.emit();
  }

  getFieldError(controlName: string): string | null {
    return this.validationErrors.getControlError(this.segmentForm.get(controlName));
  }

  protected trackByValue = (_: number, item: { value: string }) => item.value;
}
