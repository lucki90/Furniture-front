import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiErrorHandler } from '../../core/error/api-error-handler.service';
import { DictionaryService } from '../service/dictionary.service';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { DefaultKitchenFormFactory } from './model/default-kitchen-form.factory';
import { CommonModule } from "@angular/common";
import { CabinetCalculatedEvent, KitchenCabinet, isBaseCabinetType, isUpperCabinetType, isFreestandingAppliance } from '../model/kitchen-state.model';
import { KitchenStateService } from '../service/kitchen-state.service';
import { SegmentType, SEGMENT_TYPE_OPTIONS } from './model/segment.model';
// Sub-komponenty sekcji formularza
import { CooktopFormComponent } from './sections/cooktop-form/cooktop-form.component';
import { HoodFormComponent } from './sections/hood-form/hood-form.component';
import { SinkFormComponent } from './sections/sink-form/sink-form.component';
import { OvenFormComponent } from './sections/oven-form/oven-form.component';
import { FridgeFormComponent } from './sections/fridge-form/fridge-form.component';
import { CascadeFormComponent } from './sections/cascade-form/cascade-form.component';
import { CornerFormComponent } from './sections/corner-form/corner-form.component';
import { EnclosureFormComponent } from './sections/enclosure-form/enclosure-form.component';
import { FormFieldComponent } from '../../shared/form-field/form-field.component';
import { getFormError } from '../../shared/form-error.util';
import { CabinetTypePickerComponent } from './cabinet-type-picker/cabinet-type-picker.component';
import { CabinetFormVisibility } from './type-config/preparer/cabinet-form-visibility';
import { CabinetSegmentsFormService } from './cabinet-segments-form.service';
import { CabinetFormEditingService } from './cabinet-form-editing.service';
import { CabinetFormTypeLifecycleService } from './cabinet-form-type-lifecycle.service';
import { CabinetFormValidationErrorsService } from './cabinet-form-validation-errors.service';
import { CabinetFormCalculationService } from './cabinet-form-calculation.service';
import { CabinetSegmentValidationService } from './cabinet-segment-validation.service';
import { CabinetSegmentsSectionComponent } from './sections/cabinet-segments-section/cabinet-segments-section.component';

@Component({
  selector: 'app-cabinet-form',
  templateUrl: './cabinet-form.component.html',
  styleUrls: ['./cabinet-form.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule,
    CooktopFormComponent, HoodFormComponent, SinkFormComponent, OvenFormComponent,
    FridgeFormComponent, CascadeFormComponent, CornerFormComponent, EnclosureFormComponent,
    FormFieldComponent, CabinetSegmentsSectionComponent]
})
export class CabinetFormComponent implements OnChanges {

  // TODO(CODEX): Cabinet form still has high domain complexity and a few `as any` casts
  // in the editing/type-switch flow. This suggests the form model and typing are still too
  // loose; the next step should be stronger per-type mappers instead of growing this component.
  @Input()
  editingCabinet: KitchenCabinet | null = null;

  @Output()
  calculated = new EventEmitter<CabinetCalculatedEvent>();

  @Output()
  cancelEdit = new EventEmitter<void>();

  private readonly dictionaryService = inject(DictionaryService);
  private readonly dialog = inject(MatDialog);
  readonly stateService = inject(KitchenStateService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly segmentsFormService = inject(CabinetSegmentsFormService);
  private readonly cabinetFormEditingService = inject(CabinetFormEditingService);
  private readonly typeLifecycleService = inject(CabinetFormTypeLifecycleService);
  private readonly validationErrorsService = inject(CabinetFormValidationErrorsService);
  private readonly calculationService = inject(CabinetFormCalculationService);
  private readonly segmentValidationService = inject(CabinetSegmentValidationService);

  form: FormGroup;
  visibility: CabinetFormVisibility = {} as CabinetFormVisibility;
  loading = false;
  /** Opening types from DictionaryService, memoized to avoid rebuilding arrays on every CD cycle. */
  readonly openingTypes = computed(() =>
    this.dictionaryService.data().openingTypes.map(item => ({
      value: item.code,
      label: item.label
    }))
  );

  // Segment UI state
  selectedSegmentIndex = -1;

  get isEditMode(): boolean {
    return this.editingCabinet !== null;
  }

  get segmentsArray(): FormArray {
    return this.form.get('segments') as FormArray;
  }

  /** Total cabinet height passed to the segment visualizer. */
  get netCabinetHeight(): number {
    return this.form.get('height')?.value ?? 0;
  }

  /** Fridge section height passed to the visualizer for BASE_FRIDGE. */
  get fridgeSectionVisualHeight(): number {
    if (this.isFridgeCabinet) {
      return this.segmentValidationService.getFridgeSectionHeight(this.form);
    }
    return 0;
  }

  get fridgeUpperSectionsHeightSum(): number {
    if (this.isFridgeCabinet) {
      return this.segmentValidationService.getUpperSectionsHeightSum(this.form);
    }
    return 0;
  }

  /** Segment types allowed above the fridge section. */
  readonly fridgeSegmentTypeOptions = computed(() =>
    SEGMENT_TYPE_OPTIONS.filter(opt =>
      opt.value === SegmentType.DOOR || opt.value === SegmentType.OPEN_SHELF
    )
  );

  /** Segment type options depend on the currently selected cabinet type. */
  get activeSegmentTypeOptions() {
    return this.isFridgeCabinet ? this.fridgeSegmentTypeOptions() : SEGMENT_TYPE_OPTIONS;
  }

  /** Returns inline error text for a single form field. */
  getFieldError(controlName: string): string | null {
    return getFormError(this.form.get(controlName));
  }

  private readonly TYPE_LABELS: Record<KitchenCabinetType, string> = {
    [KitchenCabinetType.BASE_TWO_DOOR]:               'Dolna - 2 drzwi',
    [KitchenCabinetType.BASE_ONE_DOOR]:               'Dolna - 1 drzwi',
    [KitchenCabinetType.BASE_WITH_DRAWERS]:           'Dolna - szuflady',
    [KitchenCabinetType.BASE_SINK]:                   'Dolna - zlewowa',
    [KitchenCabinetType.BASE_COOKTOP]:                'Dolna - pod plyte grzewcza',
    [KitchenCabinetType.BASE_DISHWASHER]:             'Dolna - zmywarka (front)',
    [KitchenCabinetType.BASE_DISHWASHER_FREESTANDING]:'Dolna - zmywarka wolnostojaca',
    [KitchenCabinetType.BASE_OVEN]:                   'Dolna - piekarnik (zabudowany)',
    [KitchenCabinetType.BASE_OVEN_FREESTANDING]:      'Dolna - piekarnik wolnostojacy',
    [KitchenCabinetType.BASE_FRIDGE]:                 'Slupek - lodowka w zabudowie',
    [KitchenCabinetType.BASE_FRIDGE_FREESTANDING]:    'Dolna - lodowka wolnostojaca',
    [KitchenCabinetType.UPPER_ONE_DOOR]:              'Wiszaca - 1 drzwi',
    [KitchenCabinetType.UPPER_TWO_DOOR]:              'Wiszaca - 2 drzwi',
    [KitchenCabinetType.UPPER_OPEN_SHELF]:            'Wiszaca - otwarta polka',
    [KitchenCabinetType.UPPER_CASCADE]:               'Wiszaca - kaskadowa',
    [KitchenCabinetType.UPPER_HOOD]:                  'Wiszaca - na okap',
    [KitchenCabinetType.UPPER_DRAINER]:               'Szafka z ociekaczem',
    [KitchenCabinetType.TALL_CABINET]:                'Slupek',
    [KitchenCabinetType.CORNER_CABINET]:              'Narozna',
  };

  get currentTypeLabel(): string {
    const type = this.form.get('kitchenCabinetType')?.value as KitchenCabinetType;
    return this.TYPE_LABELS[type] ?? 'Wybierz typ...';
  }

  openTypePicker(): void {
    const ref = this.dialog.open(CabinetTypePickerComponent, {
      width: '600px',
      maxHeight: '80vh',
      panelClass: 'cabinet-picker-dialog'
    });
    ref.afterClosed().subscribe((type: KitchenCabinetType | null) => {
      if (type) {
        this.form.get('kitchenCabinetType')?.setValue(type);
      }
    });
  }

  /** Whether the current type is a base cabinet. */
  get isBaseCabinet(): boolean {
    const type = this.form.get('kitchenCabinetType')?.value as KitchenCabinetType;
    return isBaseCabinetType(type);
  }

  /** Whether the current type is an upper cabinet. */
  get isUpperCabinet(): boolean {
    const type = this.form.get('kitchenCabinetType')?.value as KitchenCabinetType;
    return isUpperCabinetType(type);
  }

  /** Whether the current type should be treated like a freestanding/full-height appliance in UI. */
  get isFreestandingAppliance(): boolean {
    const type = this.form.get('kitchenCabinetType')?.value as KitchenCabinetType;
    return isFreestandingAppliance(type) || type === KitchenCabinetType.BASE_FRIDGE;
  }

  /** Whether upper cabinet position is defined relative to countertop. */
  get isCountertopMode(): boolean {
    return this.form.get('positioningMode')?.value === 'RELATIVE_TO_COUNTERTOP';
  }

  /** Computed countertop height from floor level. */
  get computedCountertopHeight(): number {
    const corpusHeight = this.form.get('height')?.value ?? 0;
    const plinth = this.stateService.plinthHeightMm();
    const countertop = this.stateService.countertopThicknessMm();
    return plinth + corpusHeight + countertop;
  }

  /** Returns validation error for total segment heights. */
  get segmentHeightError(): string | null {
    const type = this.form.get('kitchenCabinetType')?.value as KitchenCabinetType;
    return this.segmentValidationService.getSegmentHeightError(this.form, type);
  }

  /** Returns validation errors for summary panel above the submit button. */
  get validationErrors(): string[] {
    return this.validationErrorsService.getValidationErrors(
      this.form,
      this.visibility,
      this.segmentHeightError
    );
  }

  /** Whether the current cabinet is a built-in fridge cabinet. */
  get isFridgeCabinet(): boolean {
    return this.form.get('kitchenCabinetType')?.value === KitchenCabinetType.BASE_FRIDGE;
  }

  private readonly errorHandler = inject(ApiErrorHandler);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private fb: FormBuilder
  ) {
    this.form = DefaultKitchenFormFactory.create(this.fb);

    this.onTypeChange(this.form.value.kitchenCabinetType);

    this.form.get('kitchenCabinetType')!
      .valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => this.onTypeChange(type as KitchenCabinetType));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editingCabinet'] && this.editingCabinet) {
      this.fillFormWithCabinet(this.editingCabinet);
    }
  }

  private fillFormWithCabinet(cabinet: KitchenCabinet): void {
    this.cabinetFormEditingService.patchFormForEditing(this.form, cabinet);
    this.onTypeChange(cabinet.type);
  }

  private onTypeChange(type: KitchenCabinetType): void {
    const lifecycleResult = this.typeLifecycleService.applyTypeChange(this.form, type, this.editingCabinet);
    this.visibility = lifecycleResult.visibility;
    // OnPush: visibility is updated outside signals, so the view needs manual refresh.
    this.cdr.markForCheck();

    if (lifecycleResult.restoreApplied) {
      this.segmentValidationService.validate(this.form, type);
    }
  }

  /** Zamknij popup edycji segmentu. */
  closeSegmentPopup(): void {
    this.selectedSegmentIndex = -1;
  }

  calculate(): void {
    // Oznacz wszystkie kontrolki jako touched - pokazuje bledy inline
    this.form.markAllAsTouched();

    this.loading = true;

    const type = this.form.get('kitchenCabinetType')!.value as KitchenCabinetType;
    const formData = this.form.getRawValue();

    this.calculationService.calculateCabinet(
      type,
      formData,
      this.stateService.materialDefaults(),
      this.editingCabinet?.id
    ).subscribe({
      next: event => {
        this.calculated.emit(event);
        this.loading = false;
        this.cdr.markForCheck(); // OnPush: HTTP callback nie jest DOM eventem
      },
      error: err => {
        console.error(err);
        this.errorHandler.handle(err);
        this.loading = false;
        this.cdr.markForCheck(); // OnPush: HTTP callback nie jest DOM eventem
      }
    });
  }

  onCancel(): void {
    this.cancelEdit.emit();
  }

  // ====== Segment actions ======

  /** Adds a new segment to the form. */
  addSegment(): void {
    this.segmentsArray.push(this.segmentsFormService.createDefaultSegment(this.fb, this.segmentsArray.length));
    this.selectedSegmentIndex = this.segmentsArray.length - 1;

    this.segmentValidationService.validate(
      this.form,
      this.form.get('kitchenCabinetType')?.value as KitchenCabinetType
    );
  }

  /**
   * Usuwa segment o podanym indeksie.
   */
  removeSegment(index: number): void {
    this.segmentsFormService.removeSegment(this.segmentsArray, index);

    if (this.selectedSegmentIndex === index) {
      this.selectedSegmentIndex = -1;
    } else if (this.selectedSegmentIndex > index) {
      this.selectedSegmentIndex--;
    }

    this.segmentValidationService.validate(
      this.form,
      this.form.get('kitchenCabinetType')?.value as KitchenCabinetType
    );
  }

  /**
   * Zaznacza segment o podanym indeksie.
   */
  selectSegment(index: number): void {
    this.selectedSegmentIndex = index;
  }

  /** Reacts to drag-and-drop reorder of segments. */
  onSegmentsReordered(): void {
    this.segmentValidationService.validate(
      this.form,
      this.form.get('kitchenCabinetType')?.value as KitchenCabinetType
    );
  }

  /**
   * Zwraca FormGroup wybranego segmentu.
   */
  get selectedSegmentForm(): FormGroup | null {
    return this.segmentsFormService.getSelectedSegmentForm(this.segmentsArray, this.selectedSegmentIndex);
  }

  protected trackByValue = (_: number, item: { value: string }) => item.value;
  protected trackByIndex = (index: number) => index;
}

