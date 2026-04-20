import { Injectable } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { SegmentFormData, SegmentType } from './model/segment.model';

/** Domyslna wysokosc nowego segmentu szafki (mm). */
const DEFAULT_SEGMENT_HEIGHT_MM = 400;

@Injectable({ providedIn: 'root' })
export class CabinetSegmentsFormService {
  createDefaultSegment(fb: FormBuilder, orderIndex: number): FormGroup {
    return fb.group({
      segmentType: [SegmentType.DOOR],
      height: [DEFAULT_SEGMENT_HEIGHT_MM],
      orderIndex: [orderIndex],
      drawerQuantity: [null],
      drawerModel: [null],
      shelfQuantity: [0],
      frontType: ['ONE_DOOR']
    });
  }

  replaceSegments(fb: FormBuilder, segmentsArray: FormArray, segments: SegmentFormData[]): void {
    while (segmentsArray.length > 0) {
      segmentsArray.removeAt(0);
    }

    segments.forEach((segment, index) => {
      segmentsArray.push(this.createSegmentFromData(fb, segment, index));
    });
  }

  removeSegment(segmentsArray: FormArray, index: number): void {
    segmentsArray.removeAt(index);
    this.reindexSegments(segmentsArray);
  }

  getSelectedSegmentForm(segmentsArray: FormArray, selectedSegmentIndex: number): FormGroup | null {
    if (selectedSegmentIndex < 0 || selectedSegmentIndex >= segmentsArray.length) {
      return null;
    }

    return segmentsArray.at(selectedSegmentIndex) as FormGroup;
  }

  private createSegmentFromData(fb: FormBuilder, segment: SegmentFormData, index: number): FormGroup {
    return fb.group({
      segmentType: [segment.segmentType],
      height: [segment.height],
      orderIndex: [segment.orderIndex ?? index],
      drawerQuantity: [segment.drawerQuantity ?? null],
      drawerModel: [segment.drawerModel ?? null],
      shelfQuantity: [segment.shelfQuantity ?? null],
      frontType: [segment.frontType ?? null]
    });
  }

  private reindexSegments(segmentsArray: FormArray): void {
    segmentsArray.controls.forEach((control, index) => {
      (control as FormGroup).patchValue({ orderIndex: index });
    });
  }
}
