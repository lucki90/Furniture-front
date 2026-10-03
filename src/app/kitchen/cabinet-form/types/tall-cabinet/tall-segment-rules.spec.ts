import { SegmentFormData, SegmentFrontType, SegmentType } from '../../model/segment.model';
import { tallSegmentIssues } from './tall-segment-rules';
import {
  T2_OVEN,
  T3_OVEN_SEGMENT_TOO_LOW,
  T4_NARROW_OVEN,
  T5_MICROWAVE_AND_OVEN,
  T6_DISHWASHER,
  TallScenarioFixture
} from './tall-segment.test-fixtures';

/** Lustro reguł backendu (`TallCabinetKitchenCabinetValidator`) — te same przypadki T planu słupka. */
describe('tallSegmentIssues — wczesna informacja o segmentach słupka', () => {
  const issues = (scenario: TallScenarioFixture) =>
    tallSegmentIssues(scenario.width, scenario.segments).map(issue => [issue.segmentIndex, issue.code]);

  it('T2, T5, T6: poprawne słupki z AGD nie mają uwag', () => {
    expect(issues(T2_OVEN)).toEqual([]);
    expect(issues(T5_MICROWAVE_AND_OVEN)).toEqual([]);
    expect(issues(T6_DISHWASHER)).toEqual([]);
  });

  it('T3: piekarnik w świetle 582 mm — za nisko, komunikat podaje różnicę', () => {
    const [issue] = tallSegmentIssues(T3_OVEN_SEGMENT_TOO_LOW.width, T3_OVEN_SEGMENT_TOO_LOW.segments);

    expect([issue.segmentIndex, issue.code]).toEqual([1, 'ex.segment.appliance.niche.too.low']);
    expect(issue.message).toContain('582 mm');
    expect(issue.message).toContain('600 mm');
    expect(issue.message).toContain('o 18 mm');
  });

  it('T4: piekarnik w słupku 450 — wnęka za wąska', () => {
    expect(issues(T4_NARROW_OVEN)).toEqual([[1, 'ex.segment.appliance.niche.too.narrow']]);
  });

  it('T7: zmywarka 60 w słupku 600 — za wąsko; zmywarka 45 w słupku 636 — za szeroko', () => {
    expect(issues({ ...T6_DISHWASHER, width: 600, segments: withDoorFront(T6_DISHWASHER.segments, SegmentFrontType.ONE_DOOR) }))
      .toEqual([[1, 'ex.segment.appliance.niche.too.narrow']]);
    const w45 = T6_DISHWASHER.segments.map(segment =>
      segment.segmentType === SegmentType.DISHWASHER ? { ...segment, dishwasherType: 'W45' as const } : segment);
    expect(issues({ ...T6_DISHWASHER, segments: w45 })).toEqual([[1, 'ex.segment.appliance.niche.too.wide']]);
  });

  it('mikrofala 45 w świetle 452 mm — za nisko', () => {
    const segments: SegmentFormData[] = [
      { segmentType: SegmentType.DOOR, height: 603, orderIndex: 0, frontType: SegmentFrontType.ONE_DOOR },
      { segmentType: SegmentType.MICROWAVE, height: 470, orderIndex: 1, microwaveType: 'M45' },
      { segmentType: SegmentType.DRAWER, height: 1127, orderIndex: 2, drawerQuantity: 3 }
    ];

    expect(tallSegmentIssues(600, segments).map(issue => issue.code)).toEqual(['ex.segment.appliance.niche.too.low']);
  });

  it('T8: pojedyncze drzwi w słupku 900 — za szerokie, dwoje drzwi w porządku', () => {
    const doors = (frontType: SegmentFrontType): SegmentFormData[] => [
      { segmentType: SegmentType.DOOR, height: 1400, orderIndex: 0, frontType },
      { segmentType: SegmentType.DRAWER, height: 600, orderIndex: 1, drawerQuantity: 3 }
    ];

    expect(tallSegmentIssues(900, doors(SegmentFrontType.ONE_DOOR)).map(issue => issue.code))
      .toEqual(['ex.segment.door.too.wide']);
    expect(tallSegmentIssues(900, doors(SegmentFrontType.TWO_DOORS))).toEqual([]);
  });

  it('T13: klapa w dół w środkowym segmencie i w słupku 900 — bez uwag (otwiera się w dół, bez limitu drzwi)', () => {
    const segments: SegmentFormData[] = [
      { segmentType: SegmentType.DOOR, height: 800, orderIndex: 0, frontType: SegmentFrontType.TWO_DOORS },
      { segmentType: SegmentType.DOOR, height: 600, orderIndex: 1, frontType: SegmentFrontType.DOWNWARDS },
      { segmentType: SegmentType.DRAWER, height: 800, orderIndex: 2, drawerQuantity: 3 }
    ];

    expect(tallSegmentIssues(600, segments)).toEqual([]);
    expect(tallSegmentIssues(900, segments)).toEqual([]);
  });

  it('T9/T10: klapa do góry tylko w najwyższym segmencie, bez frontu składanego', () => {
    const flap = (orderIndex: number, liftMechanismType: string): SegmentFormData => ({
      segmentType: SegmentType.DOOR, height: 600, orderIndex, frontType: SegmentFrontType.UPWARDS, liftMechanismType
    });
    const door: SegmentFormData = {
      segmentType: SegmentType.DOOR, height: 800, orderIndex: 0, frontType: SegmentFrontType.ONE_DOOR
    };

    expect(tallSegmentIssues(600, [flap(0, 'GAS_GTV'), { ...door, orderIndex: 1 }])).toEqual([]);
    expect(tallSegmentIssues(600, [door, flap(1, 'GAS_GTV')]).map(issue => [issue.segmentIndex, issue.code]))
      .toEqual([[1, 'ex.segment.lift.not.top']]);
    expect(tallSegmentIssues(600, [flap(0, 'AVENTOS_HF_TOP')]).map(issue => issue.code))
      .toEqual(['ex.segment.lift.mechanism.unsupported']);
  });
});

function withDoorFront(segments: SegmentFormData[], frontType: SegmentFrontType): SegmentFormData[] {
  return segments.map(segment => segment.segmentType === SegmentType.DOOR ? { ...segment, frontType } : segment);
}
