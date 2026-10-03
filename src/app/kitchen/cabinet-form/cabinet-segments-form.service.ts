import { inject, Injectable } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { SegmentFormData, SegmentType } from './model/segment.model';
import { KitchenCabinetConstraints } from './model/kitchen-cabinet-constants';
import { ProjectSettingsService } from '../service/project-settings.service';

/** Domyślna wysokość nowego segmentu szafki (mm). */
const DEFAULT_SEGMENT_HEIGHT_MM = 400;
const MAX_DRAWER_CUSTOM_HEIGHTS = KitchenCabinetConstraints.BASE_WITH_DRAWERS.DRAWER_MAX;

@Injectable({ providedIn: 'root' })
export class CabinetSegmentsFormService {
  private readonly fb = inject(FormBuilder);
  private readonly projectSettings = inject(ProjectSettingsService);

  createDefaultSegment(orderIndex: number): FormGroup {
    return this.fb.group({
      segmentType: [SegmentType.DOOR],
      height: [DEFAULT_SEGMENT_HEIGHT_MM],
      orderIndex: [orderIndex],
      drawerQuantity: [null],
      drawerModel: [null],
      shelfQuantity: [0],
      frontType: ['ONE_DOOR'],
      // Dla OVEN: typ wnęki piekarnika (STANDARD/COMPACT). null gdy segment nie jest OVEN.
      ovenHeightType: [null]
    });
  }

  replaceSegments(segmentsArray: FormArray, segments: SegmentFormData[]): void {
    while (segmentsArray.length > 0) {
      segmentsArray.removeAt(0);
    }

    segments.forEach((segment, index) => {
      segmentsArray.push(this.createSegmentFromData(segment, index));
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

  private createSegmentFromData(segment: SegmentFormData, index: number): FormGroup {
    return this.fb.group({
      segmentType: [segment.segmentType],
      height: [segment.height],
      orderIndex: [segment.orderIndex ?? index],
      drawerQuantity: [segment.drawerQuantity ?? null],
      drawerModel: [segment.drawerModel ?? null],
      shelfQuantity: [segment.shelfQuantity ?? null],
      frontType: [segment.frontType ?? null],
      ovenHeightType: [segment.ovenHeightType ?? null]
    });
  }

  /**
   * Synchronizuje rozmiar FormArray `drawerCustomHeightsMm` z podaną liczbą szuflad.
   * Dodaje nowe kontrolki (null) albo usuwa nadmiarowe z końca tablicy.
   */
  syncDrawerCustomHeights(drawerCustomHeightsArray: FormArray, qty: number): void {
    const safeQty = !Number.isFinite(qty) ? 0 : Math.max(0, Math.min(Math.round(qty), MAX_DRAWER_CUSTOM_HEIGHTS));
    while (drawerCustomHeightsArray.length < safeQty) {
      drawerCustomHeightsArray.push(this.fb.control<number | null>(null));
    }
    while (drawerCustomHeightsArray.length > safeQty) {
      drawerCustomHeightsArray.removeAt(drawerCustomHeightsArray.length - 1);
    }
  }

  /**
   * Zwraca ostrzeżenie, gdy suma wysokości szuflad CUSTOM nie równa się wysokości korpusu.
   * Zakłada szczeliny przy wieńcach oraz pomiędzy sąsiednimi frontami.
   * Zwraca null gdy układ nie jest CUSTOM, brak danych lub suma się zgadza.
   */
  getCustomHeightsTotalWarning(
    drawerLayoutType: string | null,
    drawerQuantity: number,
    cabinetHeight: number,
    heights: Array<number | null>
  ): string | null {
    if (drawerLayoutType !== 'CUSTOM') return null;
    if (!Number.isInteger(drawerQuantity) || drawerQuantity < 1 || cabinetHeight <= 0) return null;
    if (heights.length !== drawerQuantity || heights.some(v => !Number.isFinite(v) || !v || v <= 0)) {
      return `Wpisz ${drawerQuantity} wysokości (> 0) dla wszystkich szuflad.`;
    }
    const gaps = this.projectSettings.drawerFrontGaps();
    const expectedSum = cabinetHeight - 2 * gaps.wreathMm - (drawerQuantity - 1) * gaps.betweenMm;
    const actualSum = heights.reduce<number>((a, b) => a + (b ?? 0), 0);
    const diff = expectedSum - actualSum;
    if (diff === 0) return null;
    return `Suma wysokości szuflad powinna wynieść ${expectedSum} mm (korpus po odjęciu szczelin). Aktualna: ${actualSum} mm, różnica: ${diff > 0 ? '+' + diff : diff} mm.`;
  }

  private reindexSegments(segmentsArray: FormArray): void {
    segmentsArray.controls.forEach((control, index) => {
      (control as FormGroup).patchValue({ orderIndex: index });
    });
  }
}
