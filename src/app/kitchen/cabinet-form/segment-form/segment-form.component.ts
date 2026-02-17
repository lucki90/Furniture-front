import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  SegmentType,
  SEGMENT_TYPE_OPTIONS,
  DOOR_FRONT_TYPE_OPTIONS,
  SegmentFrontType
} from '../model/segment.model';
import { KitchenCabinetConstraints } from '../model/kitchen-cabinet-constants';

/**
 * Komponent formularza pojedynczego segmentu.
 * Wyświetla opcje zależne od typu segmentu (szuflady, drzwi, otwarte półki).
 */
@Component({
  selector: 'app-segment-form',
  templateUrl: './segment-form.component.html',
  styleUrls: ['./segment-form.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class SegmentFormComponent implements OnInit {

  @Input() segmentForm!: FormGroup;
  @Input() segmentIndex!: number;

  @Output() remove = new EventEmitter<void>();

  readonly segmentTypeOptions = SEGMENT_TYPE_OPTIONS;
  readonly doorFrontTypeOptions = DOOR_FRONT_TYPE_OPTIONS;
  readonly constraints = KitchenCabinetConstraints.TALL_CABINET;

  readonly drawerModels = [
    { value: 'ANTARO_TANDEMBOX', label: 'Blum Antaro Tandembox' },
    { value: 'SEVROLL_BALL', label: 'Sevroll Ball' }
  ];

  ngOnInit(): void {
    // Nasłuchuj zmian typu segmentu
    this.segmentForm.get('segmentType')?.valueChanges.subscribe(type => {
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
    }
  }

  onRemove(): void {
    this.remove.emit();
  }
}
