import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { KitchenService } from '../service/kitchen.service';
import { DictionaryService, DictionaryItem } from '../service/dictionary.service';
import { KitchenCabinetTypeConfig } from './type-config/kitchen-cabinet-type-config';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { DefaultKitchenFormFactory } from './model/default-kitchen-form.factory';
import { OPENING_TYPES, KitchenCabinetConstraints } from './model/kitchen-cabinet-constants';
import { CommonModule } from "@angular/common";
import { CabinetCalculatedEvent, KitchenCabinet } from '../model/kitchen-state.model';
import { SegmentFormComponent } from './segment-form/segment-form.component';
import { SegmentVisualizerComponent } from './segment-visualizer/segment-visualizer.component';
import { SegmentType } from './model/segment.model';
import { TallCabinetValidator } from './types/tall-cabinet/tall-cabinet-validator';
import {
  CornerMechanismType,
  CORNER_MECHANISM_LABELS,
  BASE_CORNER_MECHANISMS,
  UPPER_CORNER_MECHANISMS,
  BASE_CORNER_CONSTRAINTS,
  UPPER_CORNER_CONSTRAINTS,
  mechanismRequiresShelves
} from './model/corner-cabinet.model';

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

  form: FormGroup;
  visibility: any = {};
  loading = false;
  loadingDictionaries = false;

  // Fallback na stałe wartości, nadpisywane przez dane z backendu
  openingTypes: { value: string; label: string }[] = [...OPENING_TYPES];

  // Dla segmentów
  selectedSegmentIndex = -1;
  private tallCabinetValidator = new TallCabinetValidator();

  // Dla szafki narożnej
  cornerMechanismLabels = CORNER_MECHANISM_LABELS;
  availableCornerMechanisms: { value: CornerMechanismType; label: string }[] = [];
  cornerConstraints = BASE_CORNER_CONSTRAINTS;

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
   * Oblicza wysokość netto szafki (bez cokołu).
   * Dla TALL_CABINET cokół to 100mm.
   */
  get netCabinetHeight(): number {
    const height = this.form.get('height')?.value ?? 0;
    return height - 100; // cokół = 100mm
  }

  /**
   * Zwraca błąd walidacji sumy wysokości segmentów.
   */
  get segmentHeightError(): string | null {
    return this.tallCabinetValidator.getSegmentsHeightError(this.form);
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
      drawerModel: cabinet.drawerModel
    });

    this.onTypeChange(cabinet.type);
  }

  private onTypeChange(type: KitchenCabinetType): void {
    const config = KitchenCabinetTypeConfig[type];
    config.preparer.prepare(this.form, this.visibility);
    config.validator.validate(this.form);

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
        drawerModel: this.editingCabinet.drawerModel
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
    }
  }

  calculate(): void {
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

      // Ustaw domyślne wartości dla dolnej
      this.form.patchValue({
        cornerWidthA: Math.max(BASE_CORNER_CONSTRAINTS.widthMin,
          Math.min(this.form.get('cornerWidthA')?.value || 900, BASE_CORNER_CONSTRAINTS.widthMax)),
        cornerWidthB: Math.max(BASE_CORNER_CONSTRAINTS.widthMin,
          Math.min(this.form.get('cornerWidthB')?.value || 900, BASE_CORNER_CONSTRAINTS.widthMax)),
        height: 820,
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
