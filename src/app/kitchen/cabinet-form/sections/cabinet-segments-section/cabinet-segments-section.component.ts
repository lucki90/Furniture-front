import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SEGMENT_TYPE_OPTIONS, SegmentFormData } from '../../model/segment.model';
import { buildTallSegmentLayout } from '../../types/tall-cabinet/tall-segment-layout';
import {
  TALL_BOX_BOARD_THICKNESS_MM,
  TallSegmentIssue,
  tallSegmentIssues
} from '../../types/tall-cabinet/tall-segment-rules';
import { SegmentFormComponent } from '../../segment-form/segment-form.component';
import { SegmentVisualizerComponent } from '../../segment-visualizer/segment-visualizer.component';
import { SectionHeaderComponent } from '../../shared/section-header.component';

/** Światło i uwagi segmentów słupka — przeliczane tylko po zmianie szerokości albo segmentów. */
interface TallSegmentInsights {
  openingHeightsMm: readonly number[];
  issuesBySegment: readonly (readonly TallSegmentIssue[])[];
}

const NO_ISSUES: readonly TallSegmentIssue[] = [];
const NO_INSIGHTS: TallSegmentInsights = { openingHeightsMm: [], issuesBySegment: [] };

@Component({
  selector: 'app-cabinet-segments-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SegmentFormComponent, SegmentVisualizerComponent, SectionHeaderComponent],
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

  private insightsKey = '';
  private insights = NO_INSIGHTS;

  /** Światło wnęki wybranego segmentu słupka; sekcje nad lodówką liczy osobny model. */
  get selectedOpeningHeightMm(): number | null {
    return this.tallInsights().openingHeightsMm[this.selectedSegmentIndex] ?? null;
  }

  get selectedSegmentIssues(): readonly TallSegmentIssue[] {
    return this.tallInsights().issuesBySegment[this.selectedSegmentIndex] ?? NO_ISSUES;
  }

  private tallInsights(): TallSegmentInsights {
    if (this.isFridgeCabinet) {
      return NO_INSIGHTS;
    }
    const width = Number(this.form.get('width')?.value) || 0;
    const segments: SegmentFormData[] = this.segmentsArray.getRawValue();
    const key = JSON.stringify([width, segments]);
    if (key !== this.insightsKey) {
      this.insightsKey = key;
      const issues = tallSegmentIssues(width, segments);
      this.insights = {
        openingHeightsMm: buildTallSegmentLayout(segments, TALL_BOX_BOARD_THICKNESS_MM).slots
          .map(slot => slot.openingHeightMm),
        issuesBySegment: segments.map((_, index) => issues.filter(issue => issue.segmentIndex === index))
      };
    }
    return this.insights;
  }
}
