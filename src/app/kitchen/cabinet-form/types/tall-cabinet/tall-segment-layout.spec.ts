import { SegmentType } from '../../model/segment.model';
import { buildTallSegmentLayout, tallSegmentOpeningHeightMm } from './tall-segment-layout';
import {
  T1_DOOR_AND_DRAWERS,
  T2_OVEN,
  T3_OVEN_SEGMENT_TOO_LOW,
  T5_MICROWAVE_AND_OVEN
} from './tall-segment.test-fixtures';

/** Te same przypadki co `SegmentLayoutTest` w backendzie (płyta korpusu 18 mm). */
describe('buildTallSegmentLayout — światło segmentów i plecy słupka', () => {
  const T = 18;

  it('T1: drzwi 1400 + szuflady 600 — światła 1364 i 582, jedne plecy na całą wysokość', () => {
    const layout = buildTallSegmentLayout(T1_DOOR_AND_DRAWERS.segments, T);

    expect(layout.slots.map(slot => [slot.startMm, slot.heightMm, slot.openingTopMm, slot.openingHeightMm]))
      .toEqual([[0, 1400, 18, 1364], [1400, 600, 1400, 582]]);
    expect(layout.backPanelSpans.map(span => [span.topMm, span.bottomMm])).toEqual([[0, 2000]]);
  });

  it('T2: piekarnik 618 — światło 600; plecy nad i pod piekarnikiem, za wnęką brak pleców', () => {
    const layout = buildTallSegmentLayout(T2_OVEN.segments, T);

    expect(layout.slots.map(slot => slot.openingHeightMm)).toEqual([764, 600, 664]);
    expect(layout.slots.map(slot => slot.backless)).toEqual([false, true, false]);
    expect(layout.backPanelSpans).toEqual([
      { firstIndex: 0, lastIndex: 0, topMm: 0, bottomMm: 800, heightMm: 800 },
      { firstIndex: 2, lastIndex: 2, topMm: 1400, bottomMm: 2100, heightMm: 700 }
    ]);
  });

  it('T3: segment piekarnika 600 w środku słupka ma światło 582 mm', () => {
    expect(buildTallSegmentLayout(T3_OVEN_SEGMENT_TOO_LOW.segments, T).slots[1].openingHeightMm).toBe(582);
  });

  it('T5: mikrofala nad piekarnikiem — wspólna przerwa w plecach za oboma wnękami', () => {
    const layout = buildTallSegmentLayout(T5_MICROWAVE_AND_OVEN.segments, T);

    expect(layout.slots.map(slot => slot.openingHeightMm)).toEqual([564, 455, 600, 491]);
    expect(layout.backPanelSpans.map(span => [span.topMm, span.bottomMm])).toEqual([[0, 600], [1673, 2200]]);
  });

  it('suma świateł = H − (n + 1)·T', () => {
    for (const heights of [[2000], [1400, 600], [800, 618, 682], [300, 300, 300, 300, 300, 300]]) {
      const segments = heights.map((height, orderIndex) => ({ segmentType: SegmentType.OPEN_SHELF, height, orderIndex }));
      const layout = buildTallSegmentLayout(segments, T);
      const cabinetHeight = heights.reduce((sum, height) => sum + height, 0);

      expect(layout.slots.reduce((sum, slot) => sum + slot.openingHeightMm, 0))
        .toBe(cabinetHeight - (heights.length + 1) * T);
    }
  });

  it('same wnęki AGD — brak pleców; brak segmentów — pusty układ', () => {
    expect(buildTallSegmentLayout([{ segmentType: SegmentType.OVEN, height: 1800 }], T).backPanelSpans)
      .toEqual([]);
    expect(buildTallSegmentLayout([], T).slots).toEqual([]);
    expect(buildTallSegmentLayout(undefined, T).slots).toEqual([]);
  });

  it('światło pojedynczego segmentu: pierwszy odejmuje wieniec górny i swoją dolną płytę, kolejne — dolną', () => {
    expect(tallSegmentOpeningHeightMm(1400, 0, T)).toBe(1364);
    expect(tallSegmentOpeningHeightMm(618, 1, T)).toBe(600);
  });
});
