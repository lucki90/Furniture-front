import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, computed, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
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
import { CornerOptionsFormComponent } from './sections/corner-options-form/corner-options-form.component';
import { EnclosureFormComponent } from './sections/enclosure-form/enclosure-form.component';
import { FormFieldComponent } from '../../shared/form-field/form-field.component';
import { CabinetTypePickerComponent, CabinetTypePickerResult } from './cabinet-type-picker/cabinet-type-picker.component';
import { CabinetFormVisibility } from './type-config/preparer/cabinet-form-visibility';
import { CabinetSegmentsFormService } from './cabinet-segments-form.service';
import { CabinetFormEditingService } from './cabinet-form-editing.service';
import { CabinetFormTypeLifecycleService } from './cabinet-form-type-lifecycle.service';
import { CabinetFormValidationErrorsService } from './cabinet-form-validation-errors.service';
import { CabinetFormCalculationService } from './cabinet-form-calculation.service';
import { CabinetSegmentValidationService } from './cabinet-segment-validation.service';
import { CabinetSegmentsSectionComponent } from './sections/cabinet-segments-section/cabinet-segments-section.component';
import {
  CARGO_BRAND_OPTIONS,
  CARGO_VARIANT_OPTIONS,
  getCargoWidthHint
} from './types/base-cargo/cargo-cabinet.model';
import { CornerMechanismType } from './model/corner-cabinet.model';
import { LiftMechanismType } from './model/kitchen-cabinet-constants';
import { CABINET_TYPE_PICKER_LABELS } from './types/cabinet-type-labels';

@Component({
  selector: 'app-cabinet-form',
  templateUrl: './cabinet-form.component.html',
  styleUrls: ['./cabinet-form.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule,
    CooktopFormComponent, HoodFormComponent, SinkFormComponent, OvenFormComponent,
    FridgeFormComponent, CascadeFormComponent, CornerFormComponent, CornerOptionsFormComponent, EnclosureFormComponent,
    FormFieldComponent, CabinetSegmentsSectionComponent, MatIconModule]
})
export class CabinetFormComponent implements OnChanges {
  protected readonly cargoVariantOptions = CARGO_VARIANT_OPTIONS;
  protected readonly cargoBrandOptions = CARGO_BRAND_OPTIONS;

  // Komponent przekracza miękki limit 500 linii ze względu na inherentną złożoność:
  // 23 typy szafek, 8 subskrypcji valueChanges + 2 effects koniecznych przy OnPush,
  // 41 linii importów Angular/Material oraz dużo getterów prezentacyjnych (adaptery form→template).
  // Dalszy podział bez sensu domenowego byłby antywzorcem (serwis przyjmujący cdr+fb+form).
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
  visibility: CabinetFormVisibility = this.typeLifecycleService.createBaseVisibility();
  /** Cache widoczności taba "Opcje" — przeliczany przy każdej zmianie `visibility`, aby template nie wołał metody 4× na cykl CD. */
  hasOptionsTab = false;
  loading = false;

  /** Aktywny tab formularza: 'basic' (wymiary/typ), 'position' (pozycjonowanie/flagi), 'options' (sekcje specjalistyczne). */
  activeTab: 'basic' | 'position' | 'options' = 'basic';

  setActiveTab(tab: 'basic' | 'position' | 'options'): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.cdr.markForCheck();
  }

  /**
   * Centralny zapis `visibility` — odświeża cache `hasOptionsTab`, aby template nie wołał metody na każdym cyklu CD.
   * KAŻDA zmiana `visibility` musi przechodzić przez tę metodę, inaczej cache się rozjedzie z realnym stanem.
   */
  private setVisibility(next: CabinetFormVisibility): void {
    this.visibility = next;
    this.hasOptionsTab = this.computeHasOptionsTab();
  }

  /** Tab "Opcje" jest widoczny tylko gdy istnieją sekcje specjalistyczne dla danego typu. */
  private computeHasOptionsTab(): boolean {
    const v = this.visibility;
    return !!(v.cornerWidthA || v.cascadeSegments || v.segments
      || v.sinkFrontType || v.cooktopType || v.hoodFrontType || v.drainerFrontType
      || v.ovenHeightType || v.fridgeSectionType || v.fridgeFreestandingType
      || v.liftUp || v.extendedFront || v.liftMechanismType || v.allowThirdLiftMechanism
      || v.hfUpperFrontHeightMm || v.enclosureSection);
  }
  /**
   * Mechanizmy podnośnika klapy dla UPPER_LIFT_UP: GAS_GTV + realny dobór Blum Aventos (HK top / HK-S / HF top).
   * Etykiety z backendowego słownika (LIFT_MECHANISM_TYPE), memoizowane aby nie odbudowywać tablicy w każdym cyklu CD.
   */
  readonly liftMechanismTypes = computed(() =>
    this.dictionaryService.data().liftMechanismTypes.map(item => ({
      value: item.code,
      label: item.label
    }))
  );
  /** Opening types from DictionaryService, memoized to avoid rebuilding arrays on every CD cycle. */
  readonly openingTypes = computed(() =>
    this.dictionaryService.data().openingTypes.map(item => ({
      value: item.code,
      label: item.label
    }))
  );
  readonly drawerModels = computed(() =>
    this.dictionaryService.data().drawerModels.map(item => ({
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
  readonly fridgeSegmentTypeOptions = SEGMENT_TYPE_OPTIONS.filter(
    opt => opt.value === SegmentType.DOOR || opt.value === SegmentType.OPEN_SHELF
  );

  /** Segment type options depend on the currently selected cabinet type. */
  get activeSegmentTypeOptions() {
    return this.isFridgeCabinet ? this.fridgeSegmentTypeOptions : SEGMENT_TYPE_OPTIONS;
  }

  /** Returns inline error text for a single form field. */
  getFieldError(controlName: string): string | null {
    return this.validationErrorsService.getControlError(this.form.get(controlName));
  }

  get currentTypeLabel(): string {
    const type = this.form.get('kitchenCabinetType')?.value as KitchenCabinetType;
    return CABINET_TYPE_PICKER_LABELS[type] ?? 'Wybierz typ...';
  }

  openTypePicker(): void {
    const ref = this.dialog.open(CabinetTypePickerComponent, {
      width: '600px',
      maxHeight: '80vh',
      panelClass: 'cabinet-picker-dialog',
      data: { isIslandWall: this.isIslandWall }
    });
    ref.afterClosed().subscribe((result: CabinetTypePickerResult | null) => {
      if (!result) return;

      // Iteracja 3 poprawka 2026-05-24: dla CORNER_CABINET picker zwraca również `isUpperCorner`
      // (dolna/górna jako 2 osobne entry-points). Ustaw silently PRZED zmianą typu — preparer
      // wewnątrz typeLifecycle odczyta isUpperCorner z formularza i ustawi odpowiednie domyślne wymiary/constraints.
      if (result.type === KitchenCabinetType.CORNER_CABINET && result.isUpperCorner !== undefined) {
        this.form.get('isUpperCorner')?.setValue(result.isUpperCorner, { emitEvent: false });
      }

      this.form.get('kitchenCabinetType')?.setValue(result.type);
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

  get isCargoCabinet(): boolean {
    return this.form.get('kitchenCabinetType')?.value === KitchenCabinetType.BASE_CARGO;
  }

  get isCargoDrawersVariant(): boolean {
    return this.isCargoCabinet && this.form.get('cargoVariant')?.value === 'DRAWERS';
  }

  get isCargoMechanismVariant(): boolean {
    return this.isCargoCabinet && this.form.get('cargoVariant')?.value === 'MECHANISM';
  }

  get isPantryPassageCabinet(): boolean {
    return this.form.get('kitchenCabinetType')?.value === KitchenCabinetType.PANTRY_PASSAGE;
  }

  get cargoDrawerQuantityLabel(): string {
    return this.isCargoMechanismVariant ? 'Ilość koszy / półek' : 'Ilość szuflad';
  }

  get cargoWidthHint(): string | null {
    return getCargoWidthHint(
      Number(this.form.get('width')?.value),
      this.form.get('cargoVariant')?.value
    );
  }

  get isIslandWall(): boolean {
    return this.stateService.selectedWall()?.type === 'ISLAND';
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

  /** Whether the submit ("Dodaj szafkę"/"Zapisz") button is disabled. Mirror of the template binding. */
  get isAddDisabled(): boolean {
    return this.loading
      || this.form.invalid
      || (this.visibility.segments && !!this.segmentHeightError);
  }

  /**
   * Human-readable reason why the submit button is disabled — shown as a hover tooltip
   * and inline hint. Returns null when the button is enabled (no reason to show).
   */
  get addDisabledReason(): string | null {
    if (!this.isAddDisabled) {
      return null;
    }
    if (this.loading) {
      return 'Trwa przetwarzanie...';
    }
    if (this.visibility.segments && this.segmentHeightError) {
      return this.segmentHeightError;
    }
    const errors = this.validationErrors;
    if (errors.length > 0) {
      return errors.join(' • ');
    }
    return 'Uzupełnij poprawnie wszystkie wymagane pola, aby dodać szafkę.';
  }

  /** Whether the current cabinet is a built-in fridge cabinet. */
  get isFridgeCabinet(): boolean {
    return this.form.get('kitchenCabinetType')?.value === KitchenCabinetType.BASE_FRIDGE;
  }

  private readonly errorHandler = inject(ApiErrorHandler);
  private readonly destroyRef = inject(DestroyRef);
  private previousWallType: string | null = null;
  private previousCabinetType: KitchenCabinetType | null = null;

  constructor(
    private fb: FormBuilder
  ) {
    this.form = DefaultKitchenFormFactory.create(this.fb);
    this.previousWallType = this.stateService.selectedWall()?.type ?? null;
    this.previousCabinetType = this.form.value.kitchenCabinetType;

    this.onTypeChange(this.form.value.kitchenCabinetType);

    this.form.get('kitchenCabinetType')!
      .valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => {
        const nextType = type as KitchenCabinetType;
        if (!this.editingCabinet && this.previousCabinetType !== null && nextType !== this.previousCabinetType) {
          this.resetGapBeforeMm();
        }
        this.previousCabinetType = nextType;
        this.onTypeChange(nextType);
      });

    // CORNER_CABINET — gdy użytkownik przełącza mechanizm wewnątrz formularza, preparer NIE jest ponownie
    // uruchamiany (resetowałby wymiary). Lifecycle service replikuje flagi widoczności wiszącej blendy.
    this.form.get('cornerMechanism')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(mechanism => {
        if (this.form.get('kitchenCabinetType')?.value !== KitchenCabinetType.CORNER_CABINET) return;
        this.setVisibility(this.typeLifecycleService.refreshCornerHangingVisibility(
          this.form, this.visibility, mechanism as CornerMechanismType
        ));
        this.cdr.markForCheck();
      });

    // UPPER_LIFT_UP — opcje zależne od mechanizmu (trzeci mechanizm / wysokość górnego frontu HF).
    // Preparer NIE jest ponownie uruchamiany przy zmianie mechanizmu w selekcie.
    this.form.get('liftMechanismType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(mechanism => {
        if (this.form.get('kitchenCabinetType')?.value !== KitchenCabinetType.UPPER_LIFT_UP) return;
        this.setVisibility(this.typeLifecycleService.refreshLiftMechanismDependentVisibility(
          this.form, this.visibility, mechanism as LiftMechanismType
        ));
        this.cdr.markForCheck();
      });

    // UPPER_LIFT_UP / HF top — walidator wysokości górnego frontu zależy od wysokości szafki (< height),
    // więc po zmianie wysokości rewalidujemy pole, gdy fronty asymetryczne HF są aktywne.
    this.form.get('height')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.visibility.hfUpperFrontHeightMm) {
          this.form.get('hfUpperFrontHeightMm')?.updateValueAndValidity({ emitEvent: false });
        }
      });

    // BASE_WITH_DRAWERS — synchronizacja FormArray wysokości szuflad z drawerQuantity i drawerLayoutType
    this.form.get('drawerLayoutType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(layout => {
        if (this.form.get('kitchenCabinetType')?.value !== KitchenCabinetType.BASE_WITH_DRAWERS) return;
        this.setVisibility({ ...this.visibility, drawerCustomHeights: layout === 'CUSTOM' });
        this.segmentsFormService.syncDrawerCustomHeights(
          this.drawerCustomHeightsArray, Number(this.form.get('drawerQuantity')?.value) || 3
        );
      });
    this.form.get('drawerQuantity')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(qty => {
        if (this.form.get('kitchenCabinetType')?.value !== KitchenCabinetType.BASE_WITH_DRAWERS
            || this.form.get('drawerLayoutType')?.value !== 'CUSTOM') return;
        this.segmentsFormService.syncDrawerCustomHeights(
          this.drawerCustomHeightsArray, Number(qty) || 3
        );
      });

    this.form.get('cargoVariant')!
      .valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(variant => this.onCargoVariantChange(variant));

    this.form.get('pantryPassageFrontType')!
      .valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.form.get('kitchenCabinetType')?.value !== KitchenCabinetType.PANTRY_PASSAGE) {
          return;
        }
        this.form.get('width')?.updateValueAndValidity({ emitEvent: false });
        this.cdr.markForCheck();
      });

    // Gdy user przełącza zakładkę FRONT/BACK wyspy i nie edytuje istniejącej szafki,
    // domyślnie ustaw cabinetSide zgodnie z aktywną zakładką.
    effect(() => {
      const side = this.stateService.visibleIslandSide();
      if (!this.editingCabinet && this.isIslandWall) {
        this.form.get('cabinetSide')?.setValue(side, { emitEvent: false });
      }
    });

    effect(() => {
      const wallType = this.stateService.selectedWall()?.type ?? null;

      if (!this.editingCabinet) {
        if (this.previousWallType !== null && wallType !== this.previousWallType) {
          this.resetGapBeforeMm();
          if (wallType !== 'ISLAND') {
            this.form.get('cabinetSide')?.setValue('FRONT', { emitEvent: false });
          }
        }
      }

      this.previousWallType = wallType;
    });
  }

  private onCargoVariantChange(variant: string): void {
    if (this.form.get('kitchenCabinetType')?.value !== KitchenCabinetType.BASE_CARGO) return;
    if (variant === 'DRAWERS') {
      this.form.patchValue({
        drawerQuantity: this.form.get('drawerQuantity')?.value ?? 3,
        drawerModel: this.form.get('drawerModel')?.value ?? this.defaultDrawerModelCode
      }, { emitEvent: false });
    } else {
      this.form.patchValue({
        drawerQuantity: this.form.get('drawerQuantity')?.value ?? 3,
        drawerModel: null
      }, { emitEvent: false });
    }
    this.form.get('drawerQuantity')?.updateValueAndValidity({ emitEvent: false });
    this.form.get('drawerModel')?.updateValueAndValidity({ emitEvent: false });
    this.form.get('cargoBrand')?.updateValueAndValidity({ emitEvent: false });
    this.cdr.markForCheck();
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
    this.setVisibility(lifecycleResult.visibility);

    // UPPER_LIFT_UP — po przywróceniu wartości edytowanej szafki widoczność opcji zależnych od mechanizmu
    // musi odzwierciedlać REALNY mechanizm zapisanej szafki, nie domyślny z preparera.
    if (type === KitchenCabinetType.UPPER_LIFT_UP) {
      this.setVisibility(this.typeLifecycleService.refreshLiftMechanismDependentVisibility(
        this.form, this.visibility, this.form.get('liftMechanismType')?.value as LiftMechanismType
      ));
    }

    // Reset taba do "basic" — w przeciwnym razie po zmianie typu można utknąć w tabie Opcje
    // który dla nowego typu może być pusty (np. przejście BASE_SINK -> BASE_OPEN).
    if (this.activeTab !== 'basic') {
      this.activeTab = 'basic';
    }

    // OnPush: visibility is updated outside signals, so the view needs manual refresh.
    this.cdr.markForCheck();

    if (lifecycleResult.restoreApplied) {
      this.segmentValidationService.validate(this.form, type);
    }
  }

  private resetGapBeforeMm(): void {
    this.form.get('gapBeforeMm')?.setValue(0, { emitEvent: false });
  }

  private get defaultDrawerModelCode(): string {
    return this.drawerModels()[0]?.value ?? 'ANTARO_TANDEMBOX';
  }

  /** Zamknij popup edycji segmentu. */
  closeSegmentPopup(): void {
    this.selectedSegmentIndex = -1;
  }

  calculate(): void {
    // Oznacz wszystkie kontrolki jako touched - pokazuje błędy inline
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
    this.segmentsArray.push(this.segmentsFormService.createDefaultSegment(this.segmentsArray.length));
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

  /** FormArray z wysokościami frontów per szuflada (CUSTOM layout). */
  get drawerCustomHeightsArray(): FormArray {
    return this.form.get('drawerCustomHeightsMm') as FormArray;
  }

  get customHeightsTotalWarning(): string | null {
    return this.segmentsFormService.getCustomHeightsTotalWarning(
      this.form.get('drawerLayoutType')?.value,
      Number(this.form.get('drawerQuantity')?.value) || 0,
      Number(this.form.get('height')?.value) || 0,
      this.drawerCustomHeightsArray.value as Array<number | null>
    );
  }
}

