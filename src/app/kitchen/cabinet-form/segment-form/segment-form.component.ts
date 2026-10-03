import { Component, computed, DestroyRef, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  SegmentType,
  SEGMENT_TYPE_OPTIONS,
  DOOR_FRONT_TYPE_OPTIONS,
  SegmentFrontType,
  OvenSegmentHeightType,
  MicrowaveSegmentType,
  DishwasherSegmentType
} from '../model/segment.model';
import { KitchenCabinetConstraints } from '../model/kitchen-cabinet-constants';
import { FormFieldComponent } from '../../../shared/form-field/form-field.component';
import { CabinetFormValidationErrorsService } from '../cabinet-form-validation-errors.service';
import { DictionaryService } from '../../service/dictionary.service';
import { TallSegmentIssue, TALL_BOX_BOARD_THICKNESS_MM } from '../types/tall-cabinet/tall-segment-rules';
import { TallApplianceNicheSpec, tallApplianceNicheSpec } from '../types/tall-cabinet/tall-appliance-niche';

/** Typy frontu drzwi poza najwyższym segmentem — klapa do góry tylko na samej górze słupka. */
const DOOR_FRONT_TYPE_OPTIONS_WITHOUT_FLAP = DOOR_FRONT_TYPE_OPTIONS
  .filter(option => option.value !== SegmentFrontType.UPWARDS);
const DOOR_FRONT_TYPES: ReadonlySet<string> = new Set(DOOR_FRONT_TYPE_OPTIONS.map(option => option.value));
/** Front składany (dwie klapy) nie pasuje do segmentu słupka — backend go odrzuca. */
const FOLDING_LIFT_MECHANISM = 'AVENTOS_HF_TOP';
const DEFAULT_LIFT_MECHANISM = 'GAS_GTV';
/** Najwęższe światło słupka dla zmywarki 60 cm (jak `TallApplianceNicheSpec` W60). */
const DISHWASHER_60_MIN_OPENING_WIDTH_MM = 600;

/**
 * Komponent formularza pojedynczego segmentu.
 * Wyświetla opcje zależne od typu segmentu, światło wnęki i uwagi do segmentu (lustro walidacji backendu).
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
  @Input() cabinetWidthMm: number | null = null;
  /** Światło wnęki segmentu słupka (mm); null, gdy formularz nie dotyczy słupka. */
  @Input() openingHeightMm: number | null = null;
  @Input() segmentIssues: readonly TallSegmentIssue[] = [];

  private readonly destroyRef = inject(DestroyRef);
  private readonly validationErrors = inject(CabinetFormValidationErrorsService);
  private readonly dictionary = inject(DictionaryService);

  @Output() remove = new EventEmitter<void>();

  @Input() segmentTypeOptions = SEGMENT_TYPE_OPTIONS;
  readonly constraints = KitchenCabinetConstraints.TALL_CABINET;

  readonly drawerModels = [
    { value: 'ANTARO_TANDEMBOX', label: 'Blum Antaro Tandembox' },
    { value: 'SEVROLL_BALL', label: 'Sevroll Ball' }
  ];

  readonly ovenHeightTypeOptions: { value: OvenSegmentHeightType; label: string }[] = [
    { value: 'STANDARD', label: 'Standardowy (wnęka min. 600 mm)' },
    { value: 'COMPACT', label: 'Kompaktowy (wnęka min. 455 mm)' }
  ];

  readonly microwaveTypeOptions: { value: MicrowaveSegmentType; label: string }[] = [
    { value: 'M38', label: 'Wysokość 38 cm (wnęka min. 380 mm)' },
    { value: 'M45', label: 'Wysokość 45 cm (wnęka min. 455 mm)' }
  ];

  readonly dishwasherTypeOptions: { value: DishwasherSegmentType; label: string }[] = [
    { value: 'W45', label: 'Szerokość 45 cm (słupek ok. 486–496 mm)' },
    { value: 'W60', label: 'Szerokość 60 cm (słupek ok. 636–646 mm)' }
  ];

  /** Podnośniki klapy pojedynczej — bez frontu składanego. */
  readonly liftMechanismOptions = computed(() =>
    this.dictionary.data().liftMechanismTypes.filter(item => item.code !== FOLDING_LIFT_MECHANISM));

  ngOnInit(): void {
    // takeUntilDestroyed zapobiega wyciekom, gdy segment jest dodawany/usuwany dynamicznie
    this.segmentForm.get('segmentType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => this.onSegmentTypeChange(type));
    this.segmentForm.get('frontType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(frontType => this.onFrontTypeChange(frontType));
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

  get isDishwasherSegment(): boolean {
    return this.segmentType === SegmentType.DISHWASHER;
  }

  get isFlap(): boolean {
    return this.isDoorSegment && this.segmentForm.get('frontType')?.value === SegmentFrontType.UPWARDS;
  }

  /** Klapa tylko w najwyższym segmencie; wybrana wcześniej zostaje widoczna, żeby uwaga miała kontekst. */
  get doorFrontTypeOptions(): typeof DOOR_FRONT_TYPE_OPTIONS {
    return this.segmentIndex === 0 || this.isFlap ? DOOR_FRONT_TYPE_OPTIONS : DOOR_FRONT_TYPE_OPTIONS_WITHOUT_FLAP;
  }

  /** Wymagane światło wnęki AGD (piekarnik, mikrofala, zmywarka); null dla pozostałych segmentów. */
  get applianceNiche(): TallApplianceNicheSpec | null {
    return tallApplianceNicheSpec(this.segmentForm.getRawValue());
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
   * Reakcja na zmianę typu segmentu — zeruje pola innych typów i ustawia wartości domyślne nowego typu.
   */
  private onSegmentTypeChange(type: SegmentType): void {
    const value = (name: string) => this.segmentForm.get(name)?.value;
    const reset = {
      drawerQuantity: null,
      drawerModel: null,
      shelfQuantity: 0,
      ovenHeightType: null,
      microwaveType: null,
      dishwasherType: null,
      liftMechanismType: null
    };

    switch (type) {
      case SegmentType.DRAWER:
        this.segmentForm.patchValue({
          ...reset,
          drawerQuantity: value('drawerQuantity') ?? 3,
          drawerModel: value('drawerModel') ?? 'ANTARO_TANDEMBOX',
          shelfQuantity: null,
          frontType: 'DRAWER'
        });
        break;

      case SegmentType.DOOR: {
        const frontType = DOOR_FRONT_TYPES.has(value('frontType')) ? value('frontType') : SegmentFrontType.ONE_DOOR;
        this.segmentForm.patchValue({
          ...reset,
          shelfQuantity: value('shelfQuantity') ?? 0,
          frontType,
          liftMechanismType: frontType === SegmentFrontType.UPWARDS ? value('liftMechanismType') : null
        });
        break;
      }

      case SegmentType.OPEN_SHELF:
        this.segmentForm.patchValue({ ...reset, shelfQuantity: value('shelfQuantity') ?? 0, frontType: 'OPEN' });
        break;

      case SegmentType.OVEN:
        this.segmentForm.patchValue({ ...reset, frontType: 'OPEN', ovenHeightType: value('ovenHeightType') ?? 'STANDARD' });
        break;

      case SegmentType.MICROWAVE:
        this.segmentForm.patchValue({ ...reset, frontType: 'OPEN', microwaveType: value('microwaveType') ?? 'M38' });
        break;

      case SegmentType.DISHWASHER:
        this.segmentForm.patchValue({
          ...reset,
          frontType: SegmentFrontType.ONE_DOOR,
          dishwasherType: value('dishwasherType') ?? this.defaultDishwasherType()
        });
        break;
    }
  }

  private onFrontTypeChange(frontType: string | null): void {
    if (!this.isDoorSegment) {
      return;
    }
    const liftMechanismType = frontType === SegmentFrontType.UPWARDS
      ? this.segmentForm.get('liftMechanismType')?.value ?? DEFAULT_LIFT_MECHANISM
      : null;
    this.segmentForm.patchValue({ liftMechanismType });
  }

  /** Zmywarka 60 cm, gdy mieści się w świetle słupka; w węższym słupku 45 cm. */
  private defaultDishwasherType(): DishwasherSegmentType {
    const openingWidth = (this.cabinetWidthMm ?? 0) - 2 * TALL_BOX_BOARD_THICKNESS_MM;
    return openingWidth >= DISHWASHER_60_MIN_OPENING_WIDTH_MM ? 'W60' : 'W45';
  }

  onRemove(): void {
    this.remove.emit();
  }

  getFieldError(controlName: string): string | null {
    return this.validationErrors.getControlError(this.segmentForm.get(controlName));
  }

  protected trackByValue = (_: number, item: { value: string }) => item.value;
  protected trackByCode = (_: number, item: { code: string }) => item.code;
}
