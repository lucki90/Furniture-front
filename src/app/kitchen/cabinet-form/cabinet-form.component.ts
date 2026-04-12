import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { KitchenService } from '../service/kitchen.service';
import { ToastService } from '../../core/error/toast.service';
import { DictionaryService } from '../service/dictionary.service';
import { KitchenCabinetTypeConfig } from './type-config/kitchen-cabinet-type-config';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { DefaultKitchenFormFactory } from './model/default-kitchen-form.factory';
import { CommonModule } from "@angular/common";
import { CabinetCalculatedEvent, KitchenCabinet, KCabinetFridge, KCabinetFridgeFreestanding, KCabinetCorner, KCabinetCascade, KCabinetTall, cabinetHasSegments, CabinetZone, isBaseCabinetType, isUpperCabinetType, isFreestandingAppliance } from '../model/kitchen-state.model';
import { KitchenStateService } from '../service/kitchen-state.service';
import { SegmentFormComponent } from './segment-form/segment-form.component';
import { SegmentVisualizerComponent } from './segment-visualizer/segment-visualizer.component';
import { SegmentFormData, SegmentType, SEGMENT_TYPE_OPTIONS } from './model/segment.model';
import { TallCabinetValidator } from './types/tall-cabinet/tall-cabinet-validator';
import { BaseFridgeCabinetValidator } from './types/base-fridge/base-fridge-cabinet-validator';
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

@Component({
  selector: 'app-cabinet-form',
  templateUrl: './cabinet-form.component.html',
  styleUrls: ['./cabinet-form.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SegmentFormComponent, SegmentVisualizerComponent,
    CooktopFormComponent, HoodFormComponent, SinkFormComponent, OvenFormComponent,
    FridgeFormComponent, CascadeFormComponent, CornerFormComponent, EnclosureFormComponent,
    FormFieldComponent]
})
export class CabinetFormComponent implements OnChanges {

  @Input()
  editingCabinet: KitchenCabinet | null = null;

  @Output()
  calculated = new EventEmitter<CabinetCalculatedEvent>();

  @Output()
  cancelEdit = new EventEmitter<void>();

  private readonly dictionaryService = inject(DictionaryService);
  private readonly dialog = inject(MatDialog);
  readonly stateService = inject(KitchenStateService);

  form: FormGroup;
  visibility: CabinetFormVisibility = {} as CabinetFormVisibility;
  loading = false;
  /** Typy otwarcia z DictionaryService (memoizowane — nie tworzy nowej tablicy przy każdym CD cycle) */
  readonly openingTypes = computed(() =>
    this.dictionaryService.data().openingTypes.map(item => ({
      value: item.code,
      label: item.label
    }))
  );

  // Dla segmentów
  selectedSegmentIndex = -1;
  private tallCabinetValidator = new TallCabinetValidator();
  readonly baseFridgeValidator = new BaseFridgeCabinetValidator();

  get isEditMode(): boolean {
    return this.editingCabinet !== null;
  }

  get segmentsArray(): FormArray {
    return this.form.get('segments') as FormArray;
  }

  /**
   * Całkowita wysokość szafki przekazywana do wizualizera segmentów.
   * Zawsze jest to całkowita wysokość — wizualizer używa jej do skalowania proporcjonalnego.
   */
  get netCabinetHeight(): number {
    return this.form.get('height')?.value ?? 0;
  }

  /**
   * Wysokość sekcji lodówki (tylko dla BASE_FRIDGE) — przekazywana do wizualizera.
   * Wizualizer wyświetla blok sekcji lodówki na dole proporcjonalnie do tej wartości.
   */
  get fridgeSectionVisualHeight(): number {
    if (this.isFridgeCabinet) {
      return this.baseFridgeValidator.getFridgeSectionHeight(this.form);
    }
    return 0;
  }

  /**
   * Opcje typów segmentów dostępne dla sekcji nad lodówką (BASE_FRIDGE).
   * Tylko DOOR i OPEN_SHELF — bez szuflad i wnęk AGD.
   * computed() — stała referencja tablicy, nie tworzy nowej instancji przy każdym CD cycle.
   */
  readonly fridgeSegmentTypeOptions = computed(() =>
    SEGMENT_TYPE_OPTIONS.filter(opt =>
      opt.value === SegmentType.DOOR || opt.value === SegmentType.OPEN_SHELF
    )
  );

  /**
   * Aktywne opcje typów segmentów — zależne od aktualnego typu szafki.
   */
  get activeSegmentTypeOptions() {
    return this.isFridgeCabinet ? this.fridgeSegmentTypeOptions() : SEGMENT_TYPE_OPTIONS;
  }

  /**
   * Zwraca komunikat błędu dla podanego pola formularza (po touched).
   * Obsługuje standardowe błędy Angular: required, min, max, widthStep + custom message.
   */
  getFieldError(controlName: string): string | null {
    return getFormError(this.form.get(controlName));
  }

  private readonly TYPE_LABELS: Record<KitchenCabinetType, string> = {
    [KitchenCabinetType.BASE_TWO_DOOR]:               'Dolna – 2 drzwi',
    [KitchenCabinetType.BASE_ONE_DOOR]:               'Dolna – 1 drzwi',
    [KitchenCabinetType.BASE_WITH_DRAWERS]:           'Dolna – szuflady',
    [KitchenCabinetType.BASE_SINK]:                   'Dolna – zlewowa',
    [KitchenCabinetType.BASE_COOKTOP]:                'Dolna – pod płytę grzewczą',
    [KitchenCabinetType.BASE_DISHWASHER]:             'Dolna – zmywarka (front)',
    [KitchenCabinetType.BASE_DISHWASHER_FREESTANDING]:'Dolna – zmywarka wolnostojąca',
    [KitchenCabinetType.BASE_OVEN]:                   'Dolna – piekarnik (zabudowany)',
    [KitchenCabinetType.BASE_OVEN_FREESTANDING]:      'Dolna – piekarnik wolnostojący',
    [KitchenCabinetType.BASE_FRIDGE]:                 'Słupek – lodówka w zabudowie',
    [KitchenCabinetType.BASE_FRIDGE_FREESTANDING]:    'Dolna – lodówka wolnostojąca',
    [KitchenCabinetType.UPPER_ONE_DOOR]:              'Wisząca – 1 drzwi',
    [KitchenCabinetType.UPPER_TWO_DOOR]:              'Wisząca – 2 drzwi',
    [KitchenCabinetType.UPPER_OPEN_SHELF]:            'Wisząca – otwarta półka',
    [KitchenCabinetType.UPPER_CASCADE]:               'Wisząca – kaskadowa',
    [KitchenCabinetType.UPPER_HOOD]:                  'Wisząca – na okap',
    [KitchenCabinetType.UPPER_DRAINER]:               'Szafka z ociekaczem',
    [KitchenCabinetType.TALL_CABINET]:                'Słupek',
    [KitchenCabinetType.CORNER_CABINET]:              'Narożna',
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

  /**
   * Czy aktualny typ to szafka dolna (BASE_*) — wyświetlamy info o blacie.
   */
  get isBaseCabinet(): boolean {
    const type = this.form.get('kitchenCabinetType')?.value as KitchenCabinetType;
    return isBaseCabinetType(type);
  }

  /**
   * Czy aktualny typ to szafka wisząca (UPPER_*) — wyświetlamy info o montażu.
   */
  get isUpperCabinet(): boolean {
    const type = this.form.get('kitchenCabinetType')?.value as KitchenCabinetType;
    return isUpperCabinetType(type);
  }

  /**
   * Czy aktualny typ to wolnostojące urządzenie AGD lub lodówka w zabudowie (strefa FULL).
   * Dla tych typów nie pokazujemy "Blat na wysokości" — brak blatu lub strefa FULL.
   * BASE_FRIDGE jest tu zachowane explicite — to nie jest wolnostojące AGD, ale też nie ma blatu.
   */
  get isFreestandingAppliance(): boolean {
    const type = this.form.get('kitchenCabinetType')?.value as KitchenCabinetType;
    return isFreestandingAppliance(type) || type === KitchenCabinetType.BASE_FRIDGE;
  }

  /**
   * Czy tryb pozycjonowania to WZGLĘDEM_BLATU — pokazujemy pole odstępu.
   */
  get isCountertopMode(): boolean {
    return this.form.get('positioningMode')?.value === 'RELATIVE_TO_COUNTERTOP';
  }

  /**
   * Obliczona wysokość blatu od podłogi:
   * cokół + wysokość korpusu + grubość blatu
   */
  get computedCountertopHeight(): number {
    const corpusHeight = this.form.get('height')?.value ?? 0;
    const plinth = this.stateService.plinthHeightMm();
    const countertop = this.stateService.countertopThicknessMm();
    return plinth + corpusHeight + countertop;
  }

  /**
   * Zwraca błąd walidacji sumy wysokości segmentów.
   * Dla TALL_CABINET: suma musi być równa wysokości netto (±5mm).
   * Dla BASE_FRIDGE: sekcje górne nie mogą być zbyt wysokie (lodówka musi mieć min. 400mm).
   */
  get segmentHeightError(): string | null {
    if (this.isFridgeCabinet) {
      return this.baseFridgeValidator.getUpperSectionsError(this.form);
    }
    return this.tallCabinetValidator.getSegmentsHeightError(this.form);
  }

  /**
   * Zwraca listę błędów walidacji dla podsumowania nad przyciskiem.
   * Nie wymaga stanu "touched" — pokazuje błędy od razu.
   */
  get validationErrors(): string[] {
    const errors: string[] = [];

    // Wymiary (tylko gdy sekcja widoczna)
    if (this.visibility.width !== false) {
      const w = this.form.get('width');
      const h = this.form.get('height');
      const d = this.form.get('depth');

      if (w?.invalid) {
        if (w.errors?.['widthStep']) errors.push(w.errors['widthStep'].message);
        else if (w.errors?.['min']) errors.push(`Szerokość: min ${w.errors['min'].min} mm`);
        else if (w.errors?.['max']) errors.push(`Szerokość: max ${w.errors['max'].max} mm`);
        else if (w.errors?.['required']) errors.push('Szerokość jest wymagana');
      }
      if (h?.invalid) {
        if (h.errors?.['min']) errors.push(`Wysokość: min ${h.errors['min'].min} mm`);
        else if (h.errors?.['max']) errors.push(`Wysokość: max ${h.errors['max'].max} mm`);
        else errors.push('Wysokość: nieprawidłowa wartość');
      }
      if (d?.invalid) {
        if (d.errors?.['min']) errors.push(`Głębokość: min ${d.errors['min'].min} mm`);
        else if (d.errors?.['max']) errors.push(`Głębokość: max ${d.errors['max'].max} mm`);
        else errors.push('Głębokość: nieprawidłowa wartość');
      }
    }

    // Front zamrażarki (BASE_FRIDGE TWO_DOORS)
    if (this.visibility.lowerFrontHeightMm) {
      const lf = this.form.get('lowerFrontHeightMm');
      if (lf?.invalid) {
        if (lf.errors?.['min']) errors.push(`Front zamrażarki: min ${lf.errors['min'].min} mm`);
        else if (lf.errors?.['max']) errors.push(`Front zamrażarki: max ${lf.errors['max'].max} mm`);
        else if (lf.errors?.['required']) errors.push('Wysokość frontu zamrażarki jest wymagana');
      }
    }

    // Narożnik
    if (this.visibility.cornerWidthA) {
      const ca = this.form.get('cornerWidthA');
      const cb = this.form.get('cornerWidthB');
      if (ca?.invalid) {
        if (ca.errors?.['min']) errors.push(`Szerokość A: min ${ca.errors['min'].min} mm`);
        else if (ca.errors?.['max']) errors.push(`Szerokość A: max ${ca.errors['max'].max} mm`);
      }
      if (cb?.invalid) {
        if (cb.errors?.['min']) errors.push(`Szerokość B: min ${cb.errors['min'].min} mm`);
        else if (cb.errors?.['max']) errors.push(`Szerokość B: max ${cb.errors['max'].max} mm`);
      }
    }

    // Segmenty (TALL_CABINET)
    if (this.visibility.segments) {
      const segErr = this.segmentHeightError;
      if (segErr) errors.push(segErr);

      if (this.segmentsArray) {
        this.segmentsArray.controls.forEach((seg, i) => {
          const fg = seg as import('@angular/forms').FormGroup;
          if (fg.get('height')?.invalid) {
            const minVal = fg.get('height')?.errors?.['min']?.min;
            errors.push(`Segment ${i + 1}: wysokość poza zakresem` + (minVal ? ` (min ${minVal} mm)` : ''));
          }
          if (fg.get('drawerQuantity')?.invalid) {
            errors.push(`Segment ${i + 1}: nieprawidłowa liczba szuflad`);
          }
        });
      }
    }

    return errors;
  }

  /**
   * Czy aktualny typ to szafka na lodówkę w zabudowie (BASE_FRIDGE).
   * Używany do przełączania UI sekcji segmentów między TALL_CABINET a BASE_FRIDGE.
   */
  get isFridgeCabinet(): boolean {
    return this.form.get('kitchenCabinetType')?.value === KitchenCabinetType.BASE_FRIDGE;
  }

  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private fb: FormBuilder,
    private kitchenService: KitchenService
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
    // Jeden cast na całą operację wypełniania formularza — patchValue ignoruje pola nieistniejące
    // w formularzu. Właściwa type-safety jest w buildCabinetFromFormData / buildTypeSpecificFields.
    const c = cabinet as any;
    this.form.patchValue({
      name: c.name || '',
      kitchenCabinetType: c.type,
      openingType: c.openingType,
      width: c.width,
      height: c.height,
      depth: c.depth,
      positionY: c.positionY ?? 0,
      shelfQuantity: c.shelfQuantity,
      drawerQuantity: c.drawerQuantity,
      drawerModel: c.drawerModel,
      positioningMode: c.positioningMode ?? 'RELATIVE_TO_CEILING',
      gapFromCountertopMm: c.gapFromCountertopMm ?? 500,
      cascadeLowerHeight: c.cascadeLowerHeight ?? 400,
      cascadeLowerDepth: c.cascadeLowerDepth ?? 400,
      cascadeUpperHeight: c.cascadeUpperHeight ?? 320,
      cascadeUpperDepth: c.cascadeUpperDepth ?? 300,
      leftEnclosureType: c.leftEnclosureType ?? 'NONE',
      rightEnclosureType: c.rightEnclosureType ?? 'NONE',
      leftSupportPlate: c.leftSupportPlate ?? false,
      rightSupportPlate: c.rightSupportPlate ?? false,
      distanceFromWallMm: c.distanceFromWallMm ?? null,
      leftFillerWidthOverrideMm: c.leftFillerWidthOverrideMm ?? null,
      rightFillerWidthOverrideMm: c.rightFillerWidthOverrideMm ?? null,
      bottomWreathOnFloor: c.bottomWreathOnFloor ?? false,
      sinkFrontType: c.sinkFrontType ?? 'TWO_DOORS',
      sinkApronEnabled: c.sinkApronEnabled ?? true,
      sinkApronHeightMm: c.sinkApronHeightMm ?? 150,
      sinkDrawerModel: c.sinkDrawerModel ?? 'ANTARO_TANDEMBOX',
      cooktopType: c.cooktopType ?? 'INDUCTION',
      cooktopFrontType: c.cooktopFrontType ?? 'DRAWERS',
      hoodFrontType: c.hoodFrontType ?? 'FLAP',
      hoodScreenEnabled: c.hoodScreenEnabled ?? false,
      hoodScreenHeightMm: c.hoodScreenHeightMm ?? 100,
      ovenHeightType: c.ovenHeightType ?? 'STANDARD',
      ovenLowerSectionType: c.ovenLowerSectionType ?? 'LOW_DRAWER',
      ovenApronEnabled: c.ovenApronEnabled ?? false,
      ovenApronHeightMm: c.ovenApronHeightMm ?? 60,
      fridgeSectionType: c.fridgeSectionType ?? 'TWO_DOORS',
      lowerFrontHeightMm: c.lowerFrontHeightMm ?? 713,
      fridgeFreestandingType: c.fridgeFreestandingType ?? 'TWO_DOORS',
      cornerOpeningType: c.cornerOpeningType ?? 'TWO_DOORS',
      cornerFrontUchylnyWidthMm: c.cornerFrontUchylnyWidthMm ?? 500,
      isLiftUp: c.isLiftUp ?? false,
      isFrontExtended: c.isFrontExtended ?? false,
      drainerFrontType: c.drainerFrontType ?? 'OPEN'
    });

    this.onTypeChange(cabinet.type);
  }

  private onTypeChange(type: KitchenCabinetType): void {
    // Resetuj WSZYSTKIE flagi widoczności przed wywołaniem preparera —
    // dzięki temu zmiana typu zawsze czyści pola poprzedniego typu
    this.visibility = {
      width: false,
      shelfQuantity: false,
      drawerQuantity: false,
      drawerModel: false,
      segments: false,
      cornerWidthA: false,
      cornerWidthB: false,
      cornerMechanism: false,
      cornerShelfQuantity: false,
      isUpperCorner: false,
      positioningMode: false,
      gapFromCountertopMm: false,
      cascadeSegments: false,
      enclosureSection: false,
      bottomWreathOnFloor: false,
      sinkFrontType: false,
      sinkApron: false,
      sinkApronHeight: false,
      sinkDrawerModel: false,
      cooktopType: false,
      cooktopFrontType: false,
      hoodFrontType: false,
      hoodScreenEnabled: false,
      hoodScreenHeight: false,
      ovenHeightType: false,
      ovenLowerSectionType: false,
      ovenApronEnabled: false,
      ovenApronHeight: false,
      ovenDrawerModel: false,
      fridgeSectionType: false,
      lowerFrontHeightMm: false,
      fridgeFreestandingType: false,
      cornerOpeningType: false,
      cornerFrontUchylnyWidth: false,
      liftUp: false,
      extendedFront: false,
      drainerFrontType: false,
      drainerWidthSelect: false,
      openingType: true   // domyślnie widoczny; preparery wolnostojących urządzeń ustawiają false
    };

    const config = KitchenCabinetTypeConfig[type];
    config.preparer.prepare(this.form, this.visibility);
    config.validator.validate(this.form);

    // Jeśli edytujemy, przywróć wartości po przygotowaniu
    if (this.editingCabinet && this.editingCabinet.type === type) {
      // Rzut na any — patchValue ignoruje nieznane pola, więc dostęp do pól specyficznych dla
      // danego typu szafki jest bezpieczny w kontekście formularza. Typowana fabryka
      // buildCabinetFromFormData() w kitchen-state.service.ts gwarantuje poprawne dane w state.
      const editCab = this.editingCabinet as any;
      this.form.patchValue({
        name: editCab.name || '',
        openingType: editCab.openingType,
        width: editCab.width,
        height: editCab.height,
        depth: editCab.depth,
        positionY: editCab.positionY ?? 0,
        shelfQuantity: editCab.shelfQuantity,
        drawerQuantity: editCab.drawerQuantity,
        drawerModel: editCab.drawerModel,
        positioningMode: editCab.positioningMode ?? 'RELATIVE_TO_CEILING',
        gapFromCountertopMm: editCab.gapFromCountertopMm ?? 500
      });

      // Przywróć wartości narożnika przy edycji
      if (type === KitchenCabinetType.CORNER_CABINET) {
        this.form.patchValue({
          cornerWidthA: editCab.cornerWidthA,
          cornerWidthB: editCab.cornerWidthB,
          cornerMechanism: editCab.cornerMechanism,
          cornerShelfQuantity: editCab.cornerShelfQuantity,
          isUpperCorner: editCab.isUpperCorner,
          cornerOpeningType: editCab.cornerOpeningType ?? 'TWO_DOORS',
          cornerFrontUchylnyWidthMm: editCab.cornerFrontUchylnyWidthMm ?? 500
        });
      }

      // Przywróć wartości segmentów kaskadowych przy edycji
      if (type === KitchenCabinetType.UPPER_CASCADE) {
        this.form.patchValue({
          cascadeLowerHeight: editCab.cascadeLowerHeight ?? 400,
          cascadeLowerDepth: editCab.cascadeLowerDepth ?? 400,
          cascadeUpperHeight: editCab.cascadeUpperHeight ?? 320,
          cascadeUpperDepth: editCab.cascadeUpperDepth ?? 300
        });
        // CascadeFormComponent obsłuży przeliczenie przez valueChanges
      }

      // Przywróć pola obudowy przy edycji
      this.form.patchValue({
        leftEnclosureType: this.editingCabinet.leftEnclosureType ?? 'NONE',
        rightEnclosureType: this.editingCabinet.rightEnclosureType ?? 'NONE',
        leftSupportPlate: this.editingCabinet.leftSupportPlate ?? false,
        rightSupportPlate: this.editingCabinet.rightSupportPlate ?? false,
        distanceFromWallMm: this.editingCabinet.distanceFromWallMm ?? null,
        leftFillerWidthOverrideMm: this.editingCabinet.leftFillerWidthOverrideMm ?? null,
        rightFillerWidthOverrideMm: this.editingCabinet.rightFillerWidthOverrideMm ?? null
      });

      // Przywróć pola lodówki w zabudowie przy edycji
      // (preparer nadpisuje je defaults — przywróć TUTAJ, po prepare())
      if (type === KitchenCabinetType.BASE_FRIDGE) {
        const fridgeCab = this.editingCabinet as KCabinetFridge;
        this.form.patchValue({
          fridgeSectionType: fridgeCab.fridgeSectionType,
          lowerFrontHeightMm: fridgeCab.lowerFrontHeightMm,
          shelfQuantity: fridgeCab.shelfQuantity ?? 0
        });
        // FridgeFormComponent obsłuży enable/disable lowerFrontHeightMm przez ngOnInit → valueChanges
      }

      // Przywróć pola wolnostojącej lodówki przy edycji
      if (type === KitchenCabinetType.BASE_FRIDGE_FREESTANDING) {
        const fridgeFSCab = this.editingCabinet as KCabinetFridgeFreestanding;
        this.form.patchValue({ fridgeFreestandingType: fridgeFSCab.fridgeFreestandingType });
      }

      // Przywróć segmenty TALL_CABINET przy edycji
      // (preparer domyślnie ustawia 2 segmenty, trzeba je zastąpić zapisanymi)
      if (type === KitchenCabinetType.TALL_CABINET && editCab.segments?.length) {
        const segmentsControl = this.form.get('segments') as FormArray;
        // Wyczyść domyślne segmenty dodane przez preparer
        while (segmentsControl.length > 0) {
          segmentsControl.removeAt(0);
        }
        // Przywróć zapisane segmenty w tej samej kolejności
        (editCab.segments as SegmentFormData[]).forEach((seg, i) => {
          segmentsControl.push(this.fb.group({
            segmentType: [seg.segmentType],
            height: [seg.height],
            orderIndex: [seg.orderIndex ?? i],
            drawerQuantity: [seg.drawerQuantity ?? null],
            drawerModel: [seg.drawerModel ?? null],
            shelfQuantity: [seg.shelfQuantity ?? null],
            frontType: [seg.frontType ?? null]
          }));
        });
        // Rewaliduj po przywróceniu segmentów
        this.tallCabinetValidator.validate(this.form);
      }

      // Przywróć sekcje górne BASE_FRIDGE przy edycji
      if (type === KitchenCabinetType.BASE_FRIDGE && editCab.segments?.length) {
        const segmentsControl = this.form.get('segments') as FormArray;
        while (segmentsControl.length > 0) {
          segmentsControl.removeAt(0);
        }
        (editCab.segments as SegmentFormData[]).forEach((seg, i) => {
          segmentsControl.push(this.fb.group({
            segmentType: [seg.segmentType],
            height: [seg.height],
            orderIndex: [seg.orderIndex ?? i],
            drawerQuantity: [seg.drawerQuantity ?? null],
            drawerModel: [seg.drawerModel ?? null],
            shelfQuantity: [seg.shelfQuantity ?? null],
            frontType: [seg.frontType ?? null]
          }));
        });
      }
    }
  }

  /** Zamknij popup edycji segmentu. */
  closeSegmentPopup(): void {
    this.selectedSegmentIndex = -1;
  }

  calculate(): void {
    // Oznacz wszystkie kontrolki jako touched — pokazuje błędy inline
    this.form.markAllAsTouched();

    this.loading = true;

    const type = this.form.get('kitchenCabinetType')!.value as KitchenCabinetType;
    const mapper = KitchenCabinetTypeConfig[type].requestMapper;
    const formData = this.form.getRawValue();
    const request = mapper.map(formData, this.stateService.materialDefaults());

    this.kitchenService.calculateCabinet(request).subscribe({
      next: res => {
        this.calculated.emit({
          formData: formData,
          result: res,
          editingCabinetId: this.editingCabinet?.id
        });
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.toastService.showHttpError(err);
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.cancelEdit.emit();
  }

  // ====== Metody dla segmentów ======

  /**
   * Dodaje nowy segment do listy.
   * Dla BASE_FRIDGE: dodaje sekcję nad lodówką (DOOR/OPEN_SHELF), domyślnie DOOR 400mm.
   * Dla TALL_CABINET: dodaje segment dowolnego typu.
   */
  addSegment(): void {
    const newSegment = this.fb.group({
      segmentType: [SegmentType.DOOR],
      height: [400],
      orderIndex: [this.segmentsArray.length],
      drawerQuantity: [null],
      drawerModel: [null],
      shelfQuantity: [0],
      frontType: ['ONE_DOOR']
    });

    this.segmentsArray.push(newSegment);
    this.selectedSegmentIndex = this.segmentsArray.length - 1;

    // Rewaliduj — walidator zależy od typu szafki
    if (this.isFridgeCabinet) {
      this.baseFridgeValidator.validate(this.form);
    } else {
      this.tallCabinetValidator.validate(this.form);
    }
  }

  /**
   * Usuwa segment o podanym indeksie.
   */
  removeSegment(index: number): void {
    this.segmentsArray.removeAt(index);

    // Zaktualizuj orderIndex dla pozostałych segmentów
    this.segmentsArray.controls.forEach((control, i) => {
      (control as FormGroup).patchValue({ orderIndex: i });
    });

    // Odznacz jeśli usunięty był zaznaczony
    if (this.selectedSegmentIndex === index) {
      this.selectedSegmentIndex = -1;
    } else if (this.selectedSegmentIndex > index) {
      this.selectedSegmentIndex--;
    }

    // Rewaliduj
    if (this.isFridgeCabinet) {
      this.baseFridgeValidator.validate(this.form);
    } else {
      this.tallCabinetValidator.validate(this.form);
    }
  }

  /**
   * Zaznacza segment o podanym indeksie.
   */
  selectSegment(index: number): void {
    this.selectedSegmentIndex = index;
  }

  /**
   * Reaguje na zmianę kolejności segmentów (drag & drop).
   */
  onSegmentsReordered(): void {
    // Rewaliduj po zmianie kolejności
    if (this.isFridgeCabinet) {
      this.baseFridgeValidator.validate(this.form);
    } else {
      this.tallCabinetValidator.validate(this.form);
    }
  }

  /**
   * Zwraca FormGroup wybranego segmentu.
   */
  get selectedSegmentForm(): FormGroup | null {
    if (this.selectedSegmentIndex < 0 || this.selectedSegmentIndex >= this.segmentsArray.length) {
      return null;
    }
    return this.segmentsArray.at(this.selectedSegmentIndex) as FormGroup;
  }

  protected trackByValue = (_: number, item: { value: string }) => item.value;
  protected trackByIndex = (index: number) => index;
}
