import { SegmentFrontType, SegmentType } from '../../../cabinet-form/model/segment.model';
import { CabinetRenderContext, DisplayFront, DisplayHandle } from '../cabinet-render-context';
import { renderTallCabinet } from './tall-cabinet.renderer';

describe('renderTallCabinet — zmywarka i klapa w słupku', () => {
  function render(segments: CabinetRenderContext['segments']) {
    const fronts: DisplayFront[] = [];
    const handles: DisplayHandle[] = [];
    renderTallCabinet({
      displayX: 0, bodyY: 0, displayWidth: 120, bodyHeight: 440, frontGap: 1,
      frontMountingType: 'OVERLAY', carcassEdgeX: 3, carcassEdgeY: 3, scaleVert: 0.2, segments
    }, fronts, handles);
    return { fronts, handles };
  }

  it('zmywarka ma front (nie wnękę AGD) z poziomym uchwytem przy górnej krawędzi', () => {
    const { fronts, handles } = render([
      { segmentType: SegmentType.DISHWASHER, height: 878, orderIndex: 0, dishwasherType: 'W60' },
      { segmentType: SegmentType.DRAWER, height: 1322, orderIndex: 1, drawerQuantity: 2 }
    ]);

    expect(fronts[0].type).toBe('DOOR_SINGLE');
    expect(handles[0].y2).toBe(handles[0].y1);
    expect(handles[0].y1).toBeLessThan(fronts[0].y + fronts[0].height / 4);
  });

  it('klapa w dół ma jeden front z poziomym uchwytem przy górnej krawędzi', () => {
    const { fronts, handles } = render([
      { segmentType: SegmentType.DOOR, height: 1000, orderIndex: 0, frontType: SegmentFrontType.ONE_DOOR },
      { segmentType: SegmentType.DOOR, height: 600, orderIndex: 1, frontType: SegmentFrontType.DOWNWARDS },
      { segmentType: SegmentType.DRAWER, height: 600, orderIndex: 2, drawerQuantity: 2 }
    ]);

    const flap = fronts[1];
    const flapHandle = handles[1];
    expect(flap.type).toBe('DOOR_SINGLE');
    expect(flapHandle.y2).toBe(flapHandle.y1);
    expect(flapHandle.y1).toBeLessThan(flap.y + flap.height / 4);
  });

  it('klapa do góry ma jeden front z poziomym uchwytem przy dolnej krawędzi', () => {
    const { fronts, handles } = render([
      { segmentType: SegmentType.DOOR, height: 600, orderIndex: 0, frontType: SegmentFrontType.UPWARDS },
      { segmentType: SegmentType.DOOR, height: 1600, orderIndex: 1, frontType: SegmentFrontType.ONE_DOOR }
    ]);

    expect(fronts.length).toBe(2);
    expect(handles[0].y2).toBe(handles[0].y1);
    expect(handles[0].y1).toBeGreaterThan(fronts[0].y + fronts[0].height * 3 / 4);
  });
});
