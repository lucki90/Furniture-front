import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { SegmentType, SEGMENT_COLORS, SEGMENT_TYPE_OPTIONS } from '../model/segment.model';

/**
 * Komponent wizualizujący układ segmentów szafki.
 * Pokazuje proporcjonalny podgląd segmentów z możliwością drag & drop.
 */
@Component({
  selector: 'app-segment-visualizer',
  templateUrl: './segment-visualizer.component.html',
  styleUrls: ['./segment-visualizer.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule]
})
export class SegmentVisualizerComponent {

  @Input() segmentsArray!: FormArray;
  @Input() netHeight: number = 2000;  // Wysokość netto szafki (bez cokołu)
  @Input() selectedIndex: number = -1;

  @Output() segmentSelected = new EventEmitter<number>();
  @Output() orderChanged = new EventEmitter<void>();

  readonly segmentColors = SEGMENT_COLORS;
  readonly minVisualizerHeight = 300;  // minimalna wysokość wizualizera w px
  readonly maxVisualizerHeight = 500;  // maksymalna wysokość wizualizera w px

  /**
   * Oblicza wysokość wizualizera proporcjonalnie do wysokości szafki.
   */
  get visualizerHeight(): number {
    // Skaluj: 2000mm szafki = 400px wizualizera
    const scaledHeight = (this.netHeight / 2000) * 400;
    return Math.min(Math.max(scaledHeight, this.minVisualizerHeight), this.maxVisualizerHeight);
  }

  /**
   * Oblicza sumę wysokości wszystkich segmentów.
   */
  get totalSegmentsHeight(): number {
    return this.segmentsArray.controls.reduce((sum, segment) => {
      const height = (segment as FormGroup).get('height')?.value ?? 0;
      return sum + height;
    }, 0);
  }

  /**
   * Sprawdza czy suma wysokości jest poprawna (z tolerancją 5mm).
   */
  get isHeightValid(): boolean {
    const difference = Math.abs(this.totalSegmentsHeight - this.netHeight);
    return difference <= 5;
  }

  /**
   * Różnica między sumą segmentów a wysokością netto.
   */
  get heightDifference(): number {
    return this.totalSegmentsHeight - this.netHeight;
  }

  /**
   * Rzutuje AbstractControl na FormGroup (dla template).
   */
  asFormGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  /**
   * Oblicza wysokość segmentu w pikselach proporcjonalnie.
   */
  getSegmentHeightPx(control: AbstractControl): number {
    const segment = this.asFormGroup(control);
    const segmentHeight = segment.get('height')?.value ?? 0;
    if (this.netHeight <= 0) return 50;  // minimum gdy brak danych
    return (segmentHeight / this.netHeight) * this.visualizerHeight;
  }

  /**
   * Pobiera kolor dla typu segmentu.
   */
  getSegmentColor(control: AbstractControl): string {
    const segment = this.asFormGroup(control);
    const segmentType = segment.get('segmentType')?.value as SegmentType;
    return this.segmentColors[segmentType] ?? '#cccccc';
  }

  /**
   * Pobiera ikonę dla typu segmentu.
   */
  getSegmentIcon(control: AbstractControl): string {
    const segment = this.asFormGroup(control);
    const segmentType = segment.get('segmentType')?.value as SegmentType;
    const option = SEGMENT_TYPE_OPTIONS.find(o => o.value === segmentType);
    return option?.icon ?? '';
  }

  /**
   * Pobiera nazwę typu segmentu.
   */
  getSegmentTypeName(control: AbstractControl): string {
    const segment = this.asFormGroup(control);
    const segmentType = segment.get('segmentType')?.value as SegmentType;
    const option = SEGMENT_TYPE_OPTIONS.find(o => o.value === segmentType);
    return option?.label ?? 'Nieznany';
  }

  /**
   * Pobiera wysokość segmentu.
   */
  getSegmentHeight(control: AbstractControl): number {
    const segment = this.asFormGroup(control);
    return segment.get('height')?.value ?? 0;
  }

  /**
   * Obsługuje kliknięcie na segment - zaznacza go.
   */
  onSegmentClick(index: number): void {
    this.segmentSelected.emit(index);
  }

  /**
   * Obsługuje zmianę kolejności przez drag & drop.
   */
  onDrop(event: CdkDragDrop<FormGroup[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      // Przenieś segment w FormArray
      const controls = this.segmentsArray.controls;
      moveItemInArray(controls, event.previousIndex, event.currentIndex);

      // Zaktualizuj orderIndex dla wszystkich segmentów
      controls.forEach((control, index) => {
        (control as FormGroup).patchValue({ orderIndex: index });
      });

      this.orderChanged.emit();
    }
  }
}
