import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SEGMENT_TYPE_OPTIONS } from '../../model/segment.model';
import { SegmentFormComponent } from '../../segment-form/segment-form.component';
import { SegmentVisualizerComponent } from '../../segment-visualizer/segment-visualizer.component';

@Component({
  selector: 'app-cabinet-segments-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SegmentFormComponent, SegmentVisualizerComponent],
  templateUrl: './cabinet-segments-section.component.html',
  styleUrls: ['./cabinet-segments-section.component.css']
})
export class CabinetSegmentsSectionComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) segmentsArray!: FormArray;
  @Input() isFridgeCabinet = false;
  @Input() netCabinetHeight = 0;
  @Input() fridgeSectionHeight = 0;
  @Input() fridgeUpperSectionsHeightSum = 0;
  @Input() selectedSegmentIndex = -1;
  @Input() selectedSegmentForm: FormGroup | null = null;
  @Input() activeSegmentTypeOptions = SEGMENT_TYPE_OPTIONS;
  @Input() segmentHeightError: string | null = null;

  @Output() addSegment = new EventEmitter<void>();
  @Output() selectSegment = new EventEmitter<number>();
  @Output() reorderSegments = new EventEmitter<void>();
  @Output() closeSegmentPopup = new EventEmitter<void>();
  @Output() removeSelectedSegment = new EventEmitter<void>();
}
