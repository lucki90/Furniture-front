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
import { getFormError } from '../../shared/form-error.util';
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
  isCargoMechanismNominalWidth
} from './types/base-cargo/cargo-cabinet.model';
import { CornerMechanismType } from './model/corner-cabinet.model';
import { ProjectSettingsConstraints, LiftMechanismType, supportsThirdLiftMechanism, supportsHfAsymmetricFront } from './model/kitchen-cabinet-constants';
import { hfUpperFrontHeightValidator } from './types/upper-lift-up/upper-lift-up.validators';

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

  /** Aktywny tab formularza: 'basic' (wymiary/typ), 'position' (pozycjonowanie/flagi), 'options' (sekcje specjalistyczne). */
  activeTab: 'basic' | 'position' | 'options' = 'basic';

  setActiveTab(tab: 'basic' | 'position' | 'options'): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.cdr.markForCheck();
  }

  /** Tab "Opcje" jest widoczny tylko gdy istnieją sekcje specjalistyczne dla danego typu. */
  hasOptionsTabContent(): boolean {
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
    [KitchenCabinetType.BASE_OPEN]:                   'Dolna - otwarta',
    [KitchenCabinetType.BASE_CARGO]:                  'Dolna - cargo',
    [KitchenCabinetType.BASE_WITH_DRAWERS]:           'Dolna - szuflady',
    [KitchenCabinetType.BASE_SINK]:                   'Dolna - zlewowa',
    [KitchenCabinetType.BASE_COOKTOP]:                'Dolna - pod plyte grzewcza',
    [KitchenCabinetType.BASE_DISHWASHER]:             'Dolna - zmywarka (front)',
    [KitchenCabinetType.BASE_DISHWASHER_FREESTANDING]:'Dolna - zmywarka wolnostojaca',
    [KitchenCabinetType.BASE_OVEN]:                   'Dolna - piekarnik (zabudowany)',
    [KitchenCabinetType.BASE_OVEN_FREESTANDING]:      'Dolna - piekarnik wolnostojacy',
    [KitchenCabinetType.BASE_FRIDGE]:                 'Slupek - lodowka w zabudowie',
    [KitchenCabinetType.BASE_FRIDGE_FREESTANDING]:    'Dolna - lodowka wolnostojaca',
    [KitchenCabinetType.PANTRY_PASSAGE]:              'Przejscie do spizarni',
    [KitchenCabinetType.UPPER_ONE_DOOR]:              'Wiszaca - 1 drzwi',
    [KitchenCabinetType.UPPER_LIFT_UP]:               'Wiszaca - klapa do gory',
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
    return this.isCargoMechanismVariant ? 'Ilosc koszy / polek' : 'Ilosc szuflad';
  }

  get cargoWidthHint(): string | null {
    const width = Number(this.form.get('width')?.value);
    if (Number.isNaN(width) || width <= 0) {
      return null;
    }

    if (this.isCargoMechanismVariant) {
      if (isCargoMechanismNominalWidth(width)) {
        return null;
      }

      return 'Uwaga: dla tej szerokosci standardowy mechanizm cargo moze nie pasowac. Upewnij sie u producenta albo wybierz wariant cargo z szufladami.';
    }

    if (this.isCargoDrawersVariant) {
      if (width <= 200) {
        return 'Uwaga: przy szerokosci 200 mm cargo z szufladami jest technicznie mozliwe, ale zwykle bardzo malo uzytkowe. Rozwaz mechanizm cargo albo inna szafke.';
      }

      if (width < 250) {
        return 'Uwaga: przy tej szerokosci szuflady wewnetrzne beda bardzo waskie. Upewnij sie, ze taki wariant bedzie praktyczny.';
      }
    }

    return null;
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
    return 'Uzupelnij poprawnie wszystkie wymagane pola, aby dodac szafke.';
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

    // CORNER_CABINET — gdy użytkownik przełącza mechanizm wewnątrz formularza (karty rodziny/systemu),
    // preparer NIE jest ponownie uruchamiany, więc parent-level visibility (opcje szafki wiszącej:
    // pozycjonowanie + przedłużany front) nie odświeżyłaby się sama. Wiszący ślepy narożnik
    // (BLIND_CORNER + isUpperCorner) musi pokazać te same opcje co zwykłe szafki wiszące — dlatego
    // odświeżamy tu odpowiednie flagi widoczności (wzorzec jak przy drawerLayoutType powyżej).
    this.form.get('cornerMechanism')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(mechanism => {
        if (this.form.get('kitchenCabinetType')?.value !== KitchenCabinetType.CORNER_CABINET) {
          return;
        }
        this.refreshCornerHangingVisibility(mechanism as CornerMechanismType);
      });

    // UPPER_LIFT_UP — opcje zależne od mechanizmu: trzeci mechanizm Aventos (HK-S / HF top) i wysokość górnego
    // frontu HF (tylko HF top). Preparer NIE jest ponownie uruchamiany przy zmianie mechanizmu w selekcie, więc tu
    // odświeżamy widoczność (parytet z BE) i zerujemy wartości, których nowy mechanizm nie obsługuje.
    this.form.get('liftMechanismType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(mechanism => {
        if (this.form.get('kitchenCabinetType')?.value !== KitchenCabinetType.UPPER_LIFT_UP) {
          return;
        }
        this.refreshLiftMechanismDependentVisibility(mechanism as LiftMechanismType);
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

    // BASE_WITH_DRAWERS — synchronizacja FormArray wysokosci z drawerQuantity i drawerLayoutType
    this.form.get('drawerLayoutType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(layout => {
        if (this.form.get('kitchenCabinetType')?.value === KitchenCabinetType.BASE_WITH_DRAWERS) {
          this.visibility = { ...this.visibility, drawerCustomHeights: layout === 'CUSTOM' };
          this.syncDrawerCustomHeightsArray();
        }
      });
    this.form.get('drawerQuantity')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.form.get('kitchenCabinetType')?.value === KitchenCabinetType.BASE_WITH_DRAWERS
            && this.form.get('drawerLayoutType')?.value === 'CUSTOM') {
          this.syncDrawerCustomHeightsArray();
        }
      });

    this.form.get('cargoVariant')!
      .valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(variant => {
        if (this.form.get('kitchenCabinetType')?.value !== KitchenCabinetType.BASE_CARGO) {
          return;
        }

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
      });

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

    // UPPER_LIFT_UP — po przywróceniu wartości edytowanej szafki (restore patchuje z emitEvent:false, więc
    // subskrypcja selektu się nie odpala) widoczność opcji zależnych od mechanizmu (trzeci mechanizm, wysokość
    // górnego frontu HF) musi odzwierciedlać REALNY mechanizm zapisanej szafki, nie domyślny z preparera.
    if (type === KitchenCabinetType.UPPER_LIFT_UP) {
      this.refreshLiftMechanismDependentVisibility(this.form.get('liftMechanismType')?.value as LiftMechanismType);
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

  /**
   * CORNER_CABINET — odświeża parent-level visibility, gdy użytkownik przełącza mechanizm
   * narożnika wewnątrz formularza (karty rodziny/systemu). Preparer NIE jest wtedy ponownie
   * uruchamiany (resetowałby wymiary = zła UX), więc tu replikujemy flagi z
   * `CornerCabinetPreparer.updateVisibilityForMechanism` dla wiszącego ślepego narożnika.
   *
   * Wiszący ślepy narożnik (BLIND_CORNER + isUpperCorner) ma mieć WSZYSTKIE opcje szafki
   * wiszącej typu "przedłużany front": pozycjonowanie + przedłużany front.
   */
  private refreshCornerHangingVisibility(mechanism: CornerMechanismType | null): void {
    const wantsUpper = this.form.get('isUpperCorner')?.value ?? false;
    const upperBlind = mechanism === CornerMechanismType.BLIND_CORNER && wantsUpper;

    this.visibility = {
      ...this.visibility,
      positioningMode: upperBlind,
      gapFromCountertopMm: upperBlind,
      gapFromAnchorMm: upperBlind,
      extendedFront: upperBlind,
      liftUp: false,
      blockUpperAbove: !upperBlind
    };

    // Domyślne wartości opcji szafki wiszącej muszą zostać wstawione przy reaktywnym przełączeniu
    // (preparer się nie odpala). Zachowujemy istniejące wartości (tryb edycji).
    if (upperBlind) {
      this.form.patchValue({
        positioningMode: this.form.get('positioningMode')?.value ?? 'RELATIVE_TO_CEILING',
        gapFromCountertopMm: this.form.get('gapFromCountertopMm')?.value
          ?? ProjectSettingsConstraints.UPPER_GAP_FROM_COUNTERTOP_DEFAULT,
        isFrontExtended: this.form.get('isFrontExtended')?.value ?? false,
        isLiftUp: false
      }, { emitEvent: false });
    }

    this.cdr.markForCheck();
  }

  /**
   * UPPER_LIFT_UP — odświeża widoczność opcji zależnych od mechanizmu podnośnika. Checkbox „Zezwól na trzeci
   * mechanizm Aventos" obsługuje wyłącznie HK-S / HF top (parytet z katalogiem BE {@code AventosCatalog}), a pole
   * wysokości górnego frontu (fronty asymetryczne TKH, doc §10.4) wyłącznie HF top — dla pozostałych mechanizmów
   * sekcje są ukrywane. Gdy nowy mechanizm nie obsługuje opcji, zerujemy wartość kontrolki, żeby nie wysłać
   * „martwej" wartości do backendu.
   */
  private refreshLiftMechanismDependentVisibility(mechanism: LiftMechanismType | null): void {
    const allowsThird = supportsThirdLiftMechanism(mechanism);
    const allowsHfAsymmetry = supportsHfAsymmetricFront(mechanism);
    this.visibility = {
      ...this.visibility,
      allowThirdLiftMechanism: allowsThird,
      hfUpperFrontHeightMm: allowsHfAsymmetry
    };
    if (!allowsThird && this.form.get('allowThirdLiftMechanism')?.value) {
      this.form.get('allowThirdLiftMechanism')?.setValue(false, { emitEvent: false });
    }
    const hfControl = this.form.get('hfUpperFrontHeightMm');
    if (allowsHfAsymmetry) {
      hfControl?.setValidators(hfUpperFrontHeightValidator);
    } else {
      hfControl?.clearValidators();
      if (hfControl?.value != null) {
        hfControl.setValue(null, { emitEvent: false });
      }
    }
    hfControl?.updateValueAndValidity({ emitEvent: false });
    this.cdr.markForCheck();
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

  /** FormArray z wysokosciami frontow per szuflada (CUSTOM layout). */
  get drawerCustomHeightsArray(): FormArray {
    return this.form.get('drawerCustomHeightsMm') as FormArray;
  }

  /**
   * Synchronizuje rozmiar FormArray `drawerCustomHeightsMm` z aktualnym `drawerQuantity`.
   * Wywolywane przy zmianie `drawerLayoutType` (na CUSTOM) lub `drawerQuantity`.
   */
  private syncDrawerCustomHeightsArray(): void {
    const qty = Number(this.form.get('drawerQuantity')?.value) || 3;
    const arr = this.drawerCustomHeightsArray;
    while (arr.length < qty) arr.push(this.fb.control<number | null>(null));
    while (arr.length > qty) arr.removeAt(arr.length - 1);
  }

  /**
   * Ostrzezenie pod polami CUSTOM heights: gdy suma + szczeliny != wysokosc korpusu.
   * Wzor (zalozenie defaults: spaceWreathFront=3, horizSpace=3):
   *   suma_external = H - 2*3 - (qty-1)*3
   */
  get customHeightsTotalWarning(): string | null {
    if (this.form.get('drawerLayoutType')?.value !== 'CUSTOM') return null;
    const qty = Number(this.form.get('drawerQuantity')?.value) || 0;
    const h = Number(this.form.get('height')?.value) || 0;
    if (qty < 1 || h <= 0) return null;
    const heights: number[] = (this.drawerCustomHeightsArray.value as Array<number | null>)
      .map(v => Number(v) || 0);
    if (heights.length !== qty || heights.some(v => v <= 0)) {
      return `Wpisz ${qty} wysokosci (> 0) dla wszystkich szuflad.`;
    }
    const expectedSum = h - 2 * 3 - (qty - 1) * 3;
    const actualSum = heights.reduce((a, b) => a + b, 0);
    const diff = expectedSum - actualSum;
    if (Math.abs(diff) <= 1) return null;
    return `Suma wysokosci (${actualSum}mm) + szczeliny powinna dac wysokosc korpusu ${h}mm. Pozostalo do rozdysponowania: ${diff}mm.`;
  }
}

