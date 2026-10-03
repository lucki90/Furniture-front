import { SegmentFormData, SegmentType } from '../../model/segment.model';

/**
 * Geometria słupka w pionie — lustro backendowego `SegmentLayout` (te same przypadki T1–T5 w testach obu stron).
 *
 * Wysokość segmentu to jego część zewnętrznej wysokości słupka (suma = wysokość korpusu). Od góry: wieniec górny
 * `[0, T]`; segment `k` zaczyna się w `start_k` i ma własną dolną płytę (przegroda albo wieniec dolny). Światło
 * segmentu: `wysokość − T − (k == 0 ? T : 0)`. Plecy: każda ciągła grupa segmentów bez wnęki AGD ma własne plecy
 * od góry płyty nad grupą do dołu jej dolnej płyty.
 */
export interface TallSegmentSlot {
  index: number;
  type: SegmentType;
  /** Górna krawędź segmentu od góry słupka (mm). */
  startMm: number;
  heightMm: number;
  openingTopMm: number;
  /** Światło — wysokość wnęki między płytami (mm). */
  openingHeightMm: number;
  /** Wnęka AGD bez pleców. */
  backless: boolean;
}

export interface TallBackPanelSpan {
  firstIndex: number;
  lastIndex: number;
  topMm: number;
  bottomMm: number;
  heightMm: number;
}

export interface TallSegmentLayout {
  slots: TallSegmentSlot[];
  backPanelSpans: TallBackPanelSpan[];
}

/** Wnęki na sprzęt bez pleców (wentylacja, przyłącza). */
const BACKLESS_SEGMENTS: ReadonlySet<SegmentType> = new Set([SegmentType.OVEN, SegmentType.MICROWAVE]);

export function tallSegmentOpeningHeightMm(segmentHeightMm: number, segmentIndex: number, boardThicknessMm: number): number {
  return segmentHeightMm - boardThicknessMm - (segmentIndex === 0 ? boardThicknessMm : 0);
}

/** Układ segmentów w kolejności formularza (0 = najwyżej). */
export function buildTallSegmentLayout(
  segments: readonly Pick<SegmentFormData, 'segmentType' | 'height'>[] | null | undefined,
  boardThicknessMm: number
): TallSegmentLayout {
  const slots: TallSegmentSlot[] = [];
  let startMm = 0;
  (segments ?? []).forEach((segment, index) => {
    const heightMm = Number(segment.height) || 0;
    slots.push({
      index,
      type: segment.segmentType,
      startMm,
      heightMm,
      openingTopMm: startMm + (index === 0 ? boardThicknessMm : 0),
      openingHeightMm: tallSegmentOpeningHeightMm(heightMm, index, boardThicknessMm),
      backless: BACKLESS_SEGMENTS.has(segment.segmentType)
    });
    startMm += heightMm;
  });
  return { slots, backPanelSpans: backPanelSpans(slots, boardThicknessMm) };
}

function backPanelSpans(slots: readonly TallSegmentSlot[], boardThicknessMm: number): TallBackPanelSpan[] {
  const spans: TallBackPanelSpan[] = [];
  let first: number | null = null;
  const close = (last: number) => {
    if (first === null || last < first) {
      return;
    }
    const topMm = first === 0 ? 0 : slots[first].startMm - boardThicknessMm;
    const bottomMm = slots[last].startMm + slots[last].heightMm;
    spans.push({ firstIndex: first, lastIndex: last, topMm, bottomMm, heightMm: bottomMm - topMm });
  };
  for (const slot of slots) {
    if (slot.backless) {
      close(slot.index - 1);
      first = null;
    } else if (first === null) {
      first = slot.index;
    }
  }
  close(slots.length - 1);
  return spans;
}
