import {
  buildHorizontalLCornerShape,
  buildVerticalLCornerShape,
  HorizontalLCornerInput,
  VerticalLCornerInput
} from './floor-plan-corner-footprint';

function input(overrides: Partial<HorizontalLCornerInput>): HorizontalLCornerInput {
  return {
    cabinetId: 'cab-1',
    x: 100,
    wallY: 200,
    armMainPx: 90,   // widthA
    armSidePx: 80,   // widthB
    depthPx: 56,     // 560 × 0.1
    junction: 'LEFT',
    doubleDoor: true,
    ...overrides
  };
}

function verticalInput(overrides: Partial<VerticalLCornerInput>): VerticalLCornerInput {
  return {
    cabinetId: 'cab-1',
    side: 'LEFT',
    wallX: 100,
    anchorY: 200,
    armMainPx: 90,   // widthA wzdłuż ściany (pionowo)
    armSidePx: 80,   // widthB
    depthPx: 56,     // głębokość korpusu w głąb pomieszczenia
    junction: 'START',
    doubleDoor: true,
    ...overrides
  };
}

describe('floor-plan-corner-footprint', () => {
  it('should return null when the side arm does not protrude beyond the corner square', () => {
    expect(buildHorizontalLCornerShape(input({ armSidePx: 56 }))).toBeNull();
    expect(buildHorizontalLCornerShape(input({ armSidePx: 40 }))).toBeNull();
  });

  it('should return null when the main arm does not protrude beyond the corner square', () => {
    expect(buildHorizontalLCornerShape(input({ armMainPx: 56 }))).toBeNull();
  });

  it('should build an L path with the side arm on the LEFT', () => {
    const shape = buildHorizontalLCornerShape(input({ junction: 'LEFT' }))!;

    // xLeft=100, xRight=190, yTopMain=200-56=144, yTopSide=200-80=120, xInner=100+56=156.
    expect(shape.pathD).toBe(
      'M 100,200 L 100,120 L 156,120 L 156,144 L 190,144 L 190,200 Z'
    );
  });

  it('should build a mirrored L path with the side arm on the RIGHT', () => {
    const shape = buildHorizontalLCornerShape(input({ junction: 'RIGHT' }))!;

    // xLeft=100, xRight=190, yTopMain=144, yTopSide=120, xInner=190-56=134.
    expect(shape.pathD).toBe(
      'M 100,200 L 100,144 L 134,144 L 134,120 L 190,120 L 190,200 Z'
    );
  });

  it('should build two door arcs meeting at the inner L corner for TWO_DOORS', () => {
    const shape = buildHorizontalLCornerShape(input({ junction: 'LEFT', doubleDoor: true }))!;

    expect(shape.doorArcs).toHaveSize(2);
    const main = shape.doorArcs.find(arc => arc.id === 'cab-1-corner-main')!;
    const side = shape.doorArcs.find(arc => arc.id === 'cab-1-corner-side')!;

    // Ramię główne: promień = armMain-depth = 90-56 = 34.
    expect(main.pathD).toContain('A 34,34');
    expect(main).toEqual(jasmine.objectContaining({ bboxX: 156, bboxW: 34, bboxH: 34 }));
    // Ramię boczne: promień = armSide-depth = 80-56 = 24.
    expect(side.pathD).toContain('A 24,24');
    expect(side).toEqual(jasmine.objectContaining({ bboxX: 156, bboxY: 120, bboxW: 24, bboxH: 24 }));
  });

  it('should build a single main-arm door arc for BIFOLD (doubleDoor=false)', () => {
    const shape = buildHorizontalLCornerShape(input({ doubleDoor: false }))!;

    expect(shape.doorArcs).toHaveSize(1);
    expect(shape.doorArcs[0].id).toBe('cab-1-corner-main');
  });

  it('should mark all door arcs as collision-free initially', () => {
    const shape = buildHorizontalLCornerShape(input({}))!;
    expect(shape.doorArcs.every(arc => !arc.hasCollision)).toBeTrue();
  });

  it('should expose two blocking rects (main + protruding side arm) for the LEFT junction', () => {
    const shape = buildHorizontalLCornerShape(input({ junction: 'LEFT' }))!;

    expect(shape.blockingRects).toHaveSize(2);
    // Ramię główne: pełna szerokość przy ścianie, głębokość korpusu.
    expect(shape.blockingRects[0]).toEqual({ x: 100, y: 144, w: 90, h: 56 });
    // Ramię boczne (lewa kolumna) wystaje aż do yTopSide=120: wysokość = armSide 80 > depth 56.
    expect(shape.blockingRects[1]).toEqual({ x: 100, y: 120, w: 56, h: 80 });
  });

  it('should mirror the side-arm blocking rect to the right column for the RIGHT junction', () => {
    const shape = buildHorizontalLCornerShape(input({ junction: 'RIGHT' }))!;

    expect(shape.blockingRects[0]).toEqual({ x: 100, y: 144, w: 90, h: 56 });
    // Ramię boczne po prawej: xInner = xRight 190 - depth 56 = 134.
    expect(shape.blockingRects[1]).toEqual({ x: 134, y: 120, w: 56, h: 80 });
  });
});

describe('floor-plan-corner-footprint — vertical walls', () => {
  it('should return null when an arm does not protrude beyond the corner square', () => {
    expect(buildVerticalLCornerShape(verticalInput({ armSidePx: 56 }))).toBeNull();
    expect(buildVerticalLCornerShape(verticalInput({ armMainPx: 56 }))).toBeNull();
  });

  it('should build an L path for a LEFT wall (body extends to the right, junction START at top)', () => {
    const shape = buildVerticalLCornerShape(verticalInput({ side: 'LEFT', junction: 'START' }))!;

    // transform (a,d)=>(100+d, 200+a); ramię główne pionowo w dół, korpus w prawo.
    expect(shape.pathD).toBe(
      'M 100,200 L 180,200 L 180,256 L 156,256 L 156,290 L 100,290 Z'
    );
  });

  it('should build two door arcs meeting at the inner corner for a LEFT wall', () => {
    const shape = buildVerticalLCornerShape(verticalInput({ side: 'LEFT', junction: 'START', doubleDoor: true }))!;

    expect(shape.doorArcs).toHaveSize(2);
    const main = shape.doorArcs.find(arc => arc.id === 'cab-1-corner-main')!;
    const side = shape.doorArcs.find(arc => arc.id === 'cab-1-corner-side')!;

    // Ramię główne: promień = armMain-depth = 90-56 = 34.
    expect(main.pathD).toContain('A 34,34');
    expect(main).toEqual(jasmine.objectContaining({ bboxX: 156, bboxY: 256, bboxW: 34, bboxH: 34 }));
    // Ramię boczne: promień = armSide-depth = 80-56 = 24.
    expect(side.pathD).toContain('A 24,24');
    expect(side).toEqual(jasmine.objectContaining({ bboxX: 156, bboxY: 256, bboxW: 24, bboxH: 24 }));
  });

  it('should expose blocking rects for the LEFT wall (main arm + protruding side arm)', () => {
    const shape = buildVerticalLCornerShape(verticalInput({ side: 'LEFT', junction: 'START' }))!;

    expect(shape.blockingRects).toHaveSize(2);
    // Ramię główne: pełna długość wzdłuż ściany (90), głębokość korpusu (56).
    expect(shape.blockingRects[0]).toEqual({ x: 100, y: 200, w: 56, h: 90 });
    // Ramię boczne wystaje aż do d=armSide 80: szerokość w głąb = 80 > depth 56.
    expect(shape.blockingRects[1]).toEqual({ x: 100, y: 200, w: 80, h: 56 });
  });

  it('should mirror the L path for a RIGHT wall (body extends to the left)', () => {
    const shape = buildVerticalLCornerShape(
      verticalInput({ side: 'RIGHT', wallX: 200, anchorY: 100, junction: 'START' })
    )!;

    // transform (a,d)=>(200-d, 100+a); korpus w lewo.
    expect(shape.pathD).toBe(
      'M 200,100 L 120,100 L 120,156 L 144,156 L 144,190 L 200,190 Z'
    );
    const main = shape.doorArcs.find(arc => arc.id === 'cab-1-corner-main')!;
    expect(main.pathD).toContain('A 34,34');
  });

  it('should build a single main-arm door arc for BIFOLD on a vertical wall', () => {
    const shape = buildVerticalLCornerShape(verticalInput({ doubleDoor: false }))!;

    expect(shape.doorArcs).toHaveSize(1);
    expect(shape.doorArcs[0].id).toBe('cab-1-corner-main');
  });
});
