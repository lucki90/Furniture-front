import { SegmentFormData, SegmentFrontType, SegmentType } from '../../model/segment.model';

/**
 * Przypadki wzorcowe słupka z planu `_docs/plan-slupek.md` — te same co `TallScenario` w testach backendu.
 * Segmenty od góry; wysokość segmentu to jego część wysokości słupka.
 */
export interface TallScenarioFixture {
  width: number;
  height: number;
  depth: number;
  segments: SegmentFormData[];
}

function door(height: number, shelfQuantity = 1, frontType = SegmentFrontType.ONE_DOOR): SegmentFormData {
  return { segmentType: SegmentType.DOOR, height, orderIndex: 0, shelfQuantity, frontType };
}

function drawers(height: number, drawerQuantity = 3): SegmentFormData {
  return { segmentType: SegmentType.DRAWER, height, orderIndex: 0, drawerQuantity, drawerModel: 'ANTARO_TANDEMBOX' };
}

function oven(height: number): SegmentFormData {
  return { segmentType: SegmentType.OVEN, height, orderIndex: 0, shelfQuantity: 0, ovenHeightType: 'STANDARD' };
}

function microwave(height: number): SegmentFormData {
  return { segmentType: SegmentType.MICROWAVE, height, orderIndex: 0, shelfQuantity: 0 };
}

function scenario(width: number, height: number, depth: number, segments: SegmentFormData[]): TallScenarioFixture {
  return { width, height, depth, segments: segments.map((segment, index) => ({ ...segment, orderIndex: index })) };
}

/** T1: 600×2000×560 — drzwi 1400, 3 szuflady 600. */
export const T1_DOOR_AND_DRAWERS = scenario(600, 2000, 560, [door(1400, 2), drawers(600)]);

/** T2: 600×2100×560 — drzwi 800, piekarnik standard 618, szuflady 682. */
export const T2_OVEN = scenario(600, 2100, 560, [door(800), oven(618), drawers(682)]);

/** T3: jak T2, segment piekarnika 600 (światło 582 mm). */
export const T3_OVEN_SEGMENT_TOO_LOW = scenario(600, 2100, 560, [door(800), oven(600), drawers(700)]);

/** T4: słupek 450 z piekarnikiem (szerokość w świetle 414 mm). */
export const T4_NARROW_OVEN = scenario(450, 2100, 560, [door(800), oven(618), drawers(682)]);

/** T5: 600×2200×560 — drzwi 600, mikrofala 473, piekarnik 618, szuflady 509. */
export const T5_MICROWAVE_AND_OVEN = scenario(600, 2200, 560, [door(600), microwave(473), oven(618), drawers(509, 2)]);
