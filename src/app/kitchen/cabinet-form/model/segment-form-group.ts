import { FormBuilder, FormGroup } from '@angular/forms';
import { SegmentFormData, SegmentType } from './segment.model';

/** Domyślna wysokość nowego segmentu szafki (mm). */
export const DEFAULT_SEGMENT_HEIGHT_MM = 400;

/**
 * Grupa formularza segmentu — jedyna definicja pól (nowy segment, odczyt projektu, domyślny słupek), żeby nowe pole
 * segmentu nie ginęło w części ścieżek. Bez typu segmentu powstaje nowy segment drzwi z wartościami domyślnymi.
 */
export function createSegmentFormGroup(fb: FormBuilder, data: Partial<SegmentFormData> = {}): FormGroup {
  const isNew = data.segmentType === undefined;
  return fb.group({
    segmentType: [isNew ? SegmentType.DOOR : data.segmentType],
    height: [data.height ?? DEFAULT_SEGMENT_HEIGHT_MM],
    orderIndex: [data.orderIndex ?? 0],
    drawerQuantity: [data.drawerQuantity ?? null],
    drawerModel: [data.drawerModel ?? null],
    shelfQuantity: [isNew ? 0 : data.shelfQuantity ?? null],
    frontType: [isNew ? 'ONE_DOOR' : data.frontType ?? null],
    // Typy sprzętu wnęk AGD i podnośnik klapy; null gdy segment ich nie dotyczy.
    ovenHeightType: [data.ovenHeightType ?? null],
    microwaveType: [data.microwaveType ?? null],
    dishwasherType: [data.dishwasherType ?? null],
    liftMechanismType: [data.liftMechanismType ?? null]
  });
}
