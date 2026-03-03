import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { KitchenService } from '../service/kitchen.service';
import { DictionaryService, DictionaryItem } from '../service/dictionary.service';
import { KitchenCabinetTypeConfig } from './type-config/kitchen-cabinet-type-config';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { DefaultKitchenFormFactory } from './model/default-kitchen-form.factory';
import { OPENING_TYPES, KitchenCabinetConstraints } from './model/kitchen-cabinet-constants';
import { CommonModule } from "@angular/common";
import { CabinetCalculatedEvent, KitchenCabinet, CabinetZone, isBaseCabinetType, isUpperCabinetType } from '../model/kitchen-state.model';
import { KitchenStateService } from '../service/kitchen-state.service';
import { SegmentFormComponent } from './segment-form/segment-form.component';
import { SegmentVisualizerComponent } from './segment-visualizer/segment-visualizer.component';
import { SegmentType } from './model/segment.model';
import { TallCabinetValidator } from './types/tall-cabinet/tall-cabinet-validator';
import { UpperCascadeCabinetPreparer } from './types/upper-cascade/upper-cascade-cabinet-preparer';
import { UpperCascadeCabinetValidator } from './types/upper-cascade/upper-cascade-cabinet-validator';
import {
  CornerMechanismType,
  CORNER_MECHANISM_LABELS,
  BASE_CORNER_MECHANISMS,
  UPPER_CORNER_MECHANISMS,
  BASE_CORNER_CONSTRAINTS,
  UPPER_CORNER_CONSTRAINTS,
  mechanismRequiresShelves
} from './model/corner-cabinet.model';
import { ENCLOSURE_TYPE_OPTIONS, EnclosureType, getEnclosureTypeOptions } from './model/enclosure.model';

@Component({
  selector: 'app-cabinet-form',
  templateUrl: './cabinet-form.component.html',
  styleUrls: ['./cabinet-form.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SegmentFormComponent, SegmentVisualizerComponent]
})
export class CabinetFormComponent implements OnChanges, OnInit {

  @Input()
  editingCabinet: KitchenCabinet | null = null;

  @Output()
  calculated = new EventEmitter<CabinetCalculatedEvent>();

  @Output()
  cancelEdit = new EventEmitter<void>();

  private readonly dictionaryService = inject(DictionaryService);
  readonly stateService = inject(KitchenStateService);

  form: FormGroup;
  visibility: any = {};
  loading = false;
  loadingDictionaries = false;

  // Fallback na stałe wartości, nadpisywane przez dane z backendu
  openingTypes: { value: string; label: string }[] = [...OPENING_TYPES];

  // Dla segmentów
  selectedSegmentIndex = -1;
  private tallCabinetValidator = new TallCabinetValidator();
  private cascadeValidator = new UpperCascadeCabinetValidator();
  private cascadePreparer = new UpperCascadeCabinetPreparer();

  // Dla szafki narożnej
  cornerMechanismLabels = CORNER_MECHANISM_LABELS;
  availableCornerMechanisms: { value: CornerMechanismType; label: string }[] = [];
  cornerConstraints = BASE_CORNER_CONSTRAINTS;

  // Opcje obudowy bocznej — aktualizowane przy zmianie typu szafki (nie tablica tworzona na każdy cykl CD)
  enclosureOptions = getEnclosureTypeOptions(false);

  /**
   * Zwraca aktualnie wybrany mechanizm narożnika.
   */
  get currentCornerMechanism(): CornerMechanismType {
    return this.form.get('cornerMechanism')?.value ?? CornerMechanismType.FIXED_SHELVES;
  }

  /**
   * Zwraca etykietę aktualnego mechanizmu narożnika.
   */
  get currentCornerMechanismLabel(): string {
    return this.cornerMechanismLabels[this.currentCornerMechanism] ?? '';
  }

  get isEditMode(): boolean {
    return this.editingCabinet !== null;
  }

  get segmentsArray(): FormArray {
    return this.form.get('segments') as FormArray;
  }

  /**
   * Wysokość korpusu netto (dla wizualizera segmentów TALL_CABINET).
   * Użytkownik podaje wysokość korpusu bezpośrednio, więc netHeight = height.
   */
  get netCabinetHeight(): number {
    return this.form.get('height')?.value ?? 0;
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
   */
  get segmentHeightError(): string | null {
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
   * Czy aktualny typ to szafka kaskadowa (UPPER_CASCADE).
   */
  get isCascadeCabinet(): boolean {
    return this.form.get('kitchenCabinetType')?.value === KitchenCabinetType.UPPER_CASCADE;
  }

  /**
   * Całkowita wysokość szafki kaskadowej (suma segmentów).
   */
  get cascadeTotalHeight(): number {
    const lower = this.form.get('cascadeLowerHeight')?.value ?? 0;
    const upper = this.form.get('cascadeUpperHeight')?.value ?? 0;
    return lower + upper;
  }

  /** Czy lewa obudowa to blenda równoległa (wymaga checkboxa supportPlate). */
  get isLeftParallelFiller(): boolean {
    return this.form.get('leftEnclosureType')?.value === 'PARALLEL_FILLER_STRIP';
  }

  /** Czy prawa obudowa to blenda równoległa (wymaga checkboxa supportPlate). */
  get isRightParallelFiller(): boolean {
    return this.form.get('rightEnclosureType')?.value === 'PARALLEL_FILLER_STRIP';
  }

  /**
   * Dynamiczne opcje selecta obudowy — zależne od strefy szafki.
   * Dla szafek wiszących (UPPER_*) etykiety SIDE_PLATE_WITH_PLINTH i SIDE_PLATE_TO_FLOOR są inne.
   */
  getEnclosureOptions() {
    return getEnclosureTypeOptions(this.isUpperCabinet);
  }

  /**
   * Błąd kolejności głębokości segmentów kaskadowych.
   */
  get cascadeDepthError(): string | null {
    if (!this.isCascadeCabinet) return null;
    return this.cascadeValidator.getDepthOrderError(this.form);
  }

  /**
   * Reaguje na zmianę wymiarów segmentów kaskadowych — przelicza height i depth.
   */
  onCascadeSegmentChange(): void {
    if (this.isCascadeCabinet) {
      this.cascadePreparer.recalculateDimensions(this.form);
    }
  }

  constructor(
    private fb: FormBuilder,
    private kitchenService: KitchenService
  ) {
    this.form = DefaultKitchenFormFactory.create(this.fb);

    this.onTypeChange(this.form.value.kitchenCabinetType);

    this.form.get('kitchenCabinetType')!
      .valueChanges
      .subscribe(type => this.onTypeChange(type as KitchenCabinetType));

    // Nasłuchiwanie zmian pól narożnika
    this.form.get('isUpperCorner')!
      .valueChanges
      .subscribe(isUpper => this.onCornerTypeChange(isUpper));

    this.form.get('cornerMechanism')!
      .valueChanges
      .subscribe(mechanism => this.onCornerMechanismChange(mechanism));
  }

  ngOnInit(): void {
    this.loadDictionaries();
  }

  private loadDictionaries(): void {
    this.loadingDictionaries = true;

    this.dictionaryService.getOpeningTypes().subscribe({
      next: (items: DictionaryItem[]) => {
        this.openingTypes = items.map(item => ({
          value: item.code,
          label: item.label
        }));
        this.loadingDictionaries = false;
      },
      error: (err) => {
        console.warn('Failed to load opening types from backend, using fallback', err);
        // Zachowaj fallback wartości
        this.loadingDictionaries = false;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editingCabinet'] && this.editingCabinet) {
      this.fillFormWithCabinet(this.editingCabinet);
    }
  }

  private fillFormWithCabinet(cabinet: KitchenCabinet): void {
    this.form.patchValue({
      name: cabinet.name || '',
      kitchenCabinetType: cabinet.type,
      openingType: cabinet.openingType,
      width: cabinet.width,
      height: cabinet.height,
      depth: cabinet.depth,
      positionY: cabinet.positionY ?? 0,
      shelfQuantity: cabinet.shelfQuantity,
      drawerQuantity: cabinet.drawerQuantity,
      drawerModel: cabinet.drawerModel,
      positioningMode: cabinet.positioningMode ?? 'RELATIVE_TO_CEILING',
      gapFromCountertopMm: cabinet.gapFromCountertopMm ?? 500,
      cascadeLowerHeight: cabinet.cascadeLowerHeight ?? 400,
      cascadeLowerDepth: cabinet.cascadeLowerDepth ?? 400,
      cascadeUpperHeight: cabinet.cascadeUpperHeight ?? 320,
      cascadeUpperDepth: cabinet.cascadeUpperDepth ?? 300,
      // Obudowa boczna
      leftEnclosureType: cabinet.leftEnclosureType ?? 'NONE',
      rightEnclosureType: cabinet.rightEnclosureType ?? 'NONE',
      leftSupportPlate: cabinet.leftSupportPlate ?? false,
      rightSupportPlate: cabinet.rightSupportPlate ?? false,
      distanceFromWallMm: cabinet.distanceFromWallMm ?? null,
      leftFillerWidthOverrideMm: cabinet.leftFillerWidthOverrideMm ?? null,
      rightFillerWidthOverrideMm: cabinet.rightFillerWidthOverrideMm ?? null
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
      enclosureSection: false
    };

    const config = KitchenCabinetTypeConfig[type];
    config.preparer.prepare(this.form, this.visibility);
    config.validator.validate(this.form);

    // Aktualizuj opcje obudowy — etykiety różnią się dla szafek wiszących (UPPER_*)
    this.enclosureOptions = getEnclosureTypeOptions(isUpperCabinetType(type));

    // Inicjalizuj opcje narożnika, jeśli to CORNER_CABINET
    if (type === KitchenCabinetType.CORNER_CABINET) {
      this.initCornerOptions();
    }

    // Jeśli edytujemy, przywróć wartości po przygotowaniu
    if (this.editingCabinet && this.editingCabinet.type === type) {
      this.form.patchValue({
        name: this.editingCabinet.name || '',
        openingType: this.editingCabinet.openingType,
        width: this.editingCabinet.width,
        height: this.editingCabinet.height,
        depth: this.editingCabinet.depth,
        positionY: this.editingCabinet.positionY ?? 0,
        shelfQuantity: this.editingCabinet.shelfQuantity,
        drawerQuantity: this.editingCabinet.drawerQuantity,
        drawerModel: this.editingCabinet.drawerModel,
        positioningMode: this.editingCabinet.positioningMode ?? 'RELATIVE_TO_CEILING',
        gapFromCountertopMm: this.editingCabinet.gapFromCountertopMm ?? 500
      });

      // Przywróć wartości narożnika przy edycji
      if (type === KitchenCabinetType.CORNER_CABINET) {
        this.form.patchValue({
          cornerWidthA: this.editingCabinet.cornerWidthA,
          cornerWidthB: this.editingCabinet.cornerWidthB,
          cornerMechanism: this.editingCabinet.cornerMechanism,
          cornerShelfQuantity: this.editingCabinet.cornerShelfQuantity,
          isUpperCorner: this.editingCabinet.isUpperCorner
        });
      }

      // Przywróć wartości segmentów kaskadowych przy edycji
      if (type === KitchenCabinetType.UPPER_CASCADE) {
        this.form.patchValue({
          cascadeLowerHeight: this.editingCabinet.cascadeLowerHeight ?? 400,
          cascadeLowerDepth: this.editingCabinet.cascadeLowerDepth ?? 400,
          cascadeUpperHeight: this.editingCabinet.cascadeUpperHeight ?? 320,
          cascadeUpperDepth: this.editingCabinet.cascadeUpperDepth ?? 300
        });
        this.cascadePreparer.recalculateDimensions(this.form);
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

      // Przywróć segmenty TALL_CABINET przy edycji
      // (preparer domyślnie ustawia 2 segmenty, trzeba je zastąpić zapisanymi)
      if (type === KitchenCabinetType.TALL_CABINET && this.editingCabinet.segments?.length) {
        const segmentsControl = this.form.get('segments') as FormArray;
        // Wyczyść domyślne segmenty dodane przez preparer
        while (segmentsControl.length > 0) {
          segmentsControl.removeAt(0);
        }
        // Przywróć zapisane segmenty w tej samej kolejności
        this.editingCabinet.segments.forEach((seg, i) => {
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
    const request = mapper.map(formData);

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
        this.loading = false;
      }
    });
  }

  onCancel(): void {
    this.cancelEdit.emit();
  }

  // ====== Metody dla szafki narożnej ======

  /**
   * Reaguje na zmianę typu narożnika (dolna/górna).
   */
  private onCornerTypeChange(isUpper: boolean): void {
    if (isUpper) {
      this.cornerConstraints = UPPER_CORNER_CONSTRAINTS;
      this.availableCornerMechanisms = UPPER_CORNER_MECHANISMS.map(m => ({
        value: m,
        label: CORNER_MECHANISM_LABELS[m]
      }));

      // Jeśli aktualny mechanizm nie jest dozwolony dla górnej, zmień na FIXED_SHELVES
      const currentMechanism = this.form.get('cornerMechanism')?.value;
      if (!UPPER_CORNER_MECHANISMS.includes(currentMechanism)) {
        this.form.patchValue({ cornerMechanism: CornerMechanismType.FIXED_SHELVES });
      }

      // Ustaw domyślne wartości dla górnej
      this.form.patchValue({
        cornerWidthA: Math.max(UPPER_CORNER_CONSTRAINTS.widthMin,
          Math.min(this.form.get('cornerWidthA')?.value || 700, UPPER_CORNER_CONSTRAINTS.widthMax)),
        cornerWidthB: Math.max(UPPER_CORNER_CONSTRAINTS.widthMin,
          Math.min(this.form.get('cornerWidthB')?.value || 700, UPPER_CORNER_CONSTRAINTS.widthMax)),
        height: 720,
        depth: 320
      });
    } else {
      this.cornerConstraints = BASE_CORNER_CONSTRAINTS;
      this.availableCornerMechanisms = BASE_CORNER_MECHANISMS.map(m => ({
        value: m,
        label: CORNER_MECHANISM_LABELS[m]
      }));

      // Ustaw domyślne wartości dla dolnej (wysokość = korpus, bez cokołu/blatu)
      this.form.patchValue({
        cornerWidthA: Math.max(BASE_CORNER_CONSTRAINTS.widthMin,
          Math.min(this.form.get('cornerWidthA')?.value || 900, BASE_CORNER_CONSTRAINTS.widthMax)),
        cornerWidthB: Math.max(BASE_CORNER_CONSTRAINTS.widthMin,
          Math.min(this.form.get('cornerWidthB')?.value || 900, BASE_CORNER_CONSTRAINTS.widthMax)),
        height: 720,
        depth: BASE_CORNER_CONSTRAINTS.depth
      });
    }

    // Rewaliduj formularz
    const type = this.form.get('kitchenCabinetType')!.value as KitchenCabinetType;
    if (type === KitchenCabinetType.CORNER_CABINET) {
      const config = KitchenCabinetTypeConfig[type];
      config.validator.validate(this.form);
    }
  }

  /**
   * Reaguje na zmianę mechanizmu narożnika.
   */
  private onCornerMechanismChange(mechanism: CornerMechanismType): void {
    // Pokaż/ukryj pole półek w zależności od mechanizmu
    this.visibility.cornerShelfQuantity = mechanismRequiresShelves(mechanism);

    // Rewaliduj formularz
    const type = this.form.get('kitchenCabinetType')!.value as KitchenCabinetType;
    if (type === KitchenCabinetType.CORNER_CABINET) {
      const config = KitchenCabinetTypeConfig[type];
      config.validator.validate(this.form);
    }
  }

  /**
   * Inicjalizuje opcje narożnika przy wyborze typu CORNER_CABINET.
   */
  private initCornerOptions(): void {
    const isUpper = this.form.get('isUpperCorner')?.value ?? false;
    this.onCornerTypeChange(isUpper);
    this.onCornerMechanismChange(this.form.get('cornerMechanism')?.value);
  }

  // ====== Metody dla segmentów ======

  /**
   * Dodaje nowy segment do listy.
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

    // Rewaliduj
    this.tallCabinetValidator.validate(this.form);
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
    this.tallCabinetValidator.validate(this.form);
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
    this.tallCabinetValidator.validate(this.form);
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
}
