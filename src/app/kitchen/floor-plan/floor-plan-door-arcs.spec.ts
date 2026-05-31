import { buildCabinetOpeningShapes, buildFloorPlanArc, buildFloorPlanArcs, CabinetOnFloorPlan } from './floor-plan-door-arcs';

function createCabinet(overrides: Partial<CabinetOnFloorPlan>): CabinetOnFloorPlan {
  return {
    cabinetId: 'cab-1',
    x: 100,
    y: 100,
    width: 80,
    depth: 60,
    zone: 'BOTTOM',
    isCorner: false,
    isFreestanding: false,
    wallType: 'MAIN',
    ...overrides
  };
}

describe('floor-plan-door-arcs', () => {
  it('should build arc geometry for horizontal walls', () => {
    const arc = buildFloorPlanArc(createCabinet({ wallType: 'MAIN', x: 100, y: 120, width: 80 }));

    expect(arc).toEqual(jasmine.objectContaining({
      cabinetId: 'cab-1',
      hasCollision: false,
      bboxX: 100,
      bboxY: 40,
      bboxW: 80,
      bboxH: 80
    }));
    expect(arc?.pathD).toContain('A 80,80');
  });

  it('should build arc geometry for vertical right wall', () => {
    const arc = buildFloorPlanArc(createCabinet({ wallType: 'RIGHT', x: 250, y: 50, depth: 70 }));

    expect(arc).toEqual(jasmine.objectContaining({
      bboxX: 180,
      bboxY: 50,
      bboxW: 70,
      bboxH: 70
    }));
    expect(arc?.pathD).toContain('A 70,70');
  });

  it('should ignore top cabinets as blocking rects for collision detection', () => {
    const arcs = buildFloorPlanArcs([
      createCabinet({ cabinetId: 'base-1', wallType: 'MAIN', x: 100, y: 120, width: 80, zone: 'BOTTOM' }),
      createCabinet({ cabinetId: 'top-1', wallType: 'MAIN', x: 110, y: 80, width: 80, zone: 'TOP' })
    ]);

    expect(arcs).toHaveSize(1);
    expect(arcs[0].cabinetId).toBe('base-1');
    expect(arcs[0].hasCollision).toBeFalse();
  });

  it('should flag collisions against other bottom or full cabinets', () => {
    const arcs = buildFloorPlanArcs([
      createCabinet({ cabinetId: 'base-1', wallType: 'MAIN', x: 100, y: 120, width: 80, zone: 'BOTTOM' }),
      createCabinet({ cabinetId: 'blocker', wallType: 'MAIN', x: 130, y: 70, width: 60, depth: 60, zone: 'FULL' })
    ]);

    expect(arcs).toHaveSize(2);
    expect(arcs.find(arc => arc.cabinetId === 'base-1')?.hasCollision).toBeTrue();
  });

  it('should draw the door arc only on the openable sub-span (blind corner, hinge LEFT)', () => {
    const shapes = buildCabinetOpeningShapes(createCabinet({
      wallType: 'MAIN',
      x: 100,
      y: 120,
      width: 80,
      opening: { kind: 'SINGLE_DOOR', hingeSide: 'LEFT', spanStartFraction: 0, spanEndFraction: 0.5 }
    }));

    expect(shapes).toHaveSize(1);
    expect(shapes[0].kind).toBe('SINGLE_DOOR');
    // Połowa szerokości 80 → promień 40, łuk tylko na otwieranej części (od x=100 do x=140).
    expect(shapes[0].pathD).toContain('A 40,40');
    expect(shapes[0]).toEqual(jasmine.objectContaining({ bboxX: 100, bboxW: 40, bboxH: 40 }));
  });

  it('should draw the door arc only on the openable sub-span (blind corner, hinge RIGHT)', () => {
    const shapes = buildCabinetOpeningShapes(createCabinet({
      wallType: 'MAIN',
      x: 100,
      y: 120,
      width: 80,
      opening: { kind: 'SINGLE_DOOR', hingeSide: 'RIGHT', spanStartFraction: 0.5, spanEndFraction: 1 }
    }));

    expect(shapes).toHaveSize(1);
    // Front uchylny po prawej: od x=140 do x=180, promień 40.
    expect(shapes[0].pathD).toContain('A 40,40');
    expect(shapes[0]).toEqual(jasmine.objectContaining({ bboxX: 140, bboxW: 40, bboxH: 40 }));
  });

  it('should draw two leaves for a double door', () => {
    const shapes = buildCabinetOpeningShapes(createCabinet({
      wallType: 'MAIN',
      x: 100,
      y: 120,
      width: 80,
      opening: { kind: 'DOUBLE_DOOR' }
    }));

    expect(shapes).toHaveSize(2);
    expect(shapes.every(shape => shape.kind === 'SINGLE_DOOR')).toBeTrue();
    // Każde skrzydło na połowie szerokości → promień 40.
    expect(shapes[0].pathD).toContain('A 40,40');
    expect(shapes[1].pathD).toContain('A 40,40');
  });

  it('should render a drawer as a pull-out rectangle, not an arc', () => {
    const shapes = buildCabinetOpeningShapes(createCabinet({
      wallType: 'MAIN',
      x: 100,
      y: 120,
      width: 80,
      depth: 60,
      opening: { kind: 'DRAWER' }
    }));

    expect(shapes).toHaveSize(1);
    expect(shapes[0].kind).toBe('DRAWER');
    // Prostokąt (brak segmentu łuku 'A'); wysuw 0.8 × głębokość 60 = 48 w górę od frontu y=120.
    expect(shapes[0].pathD).not.toContain('A ');
    expect(shapes[0]).toEqual(jasmine.objectContaining({ bboxX: 100, bboxY: 72, bboxW: 80, bboxH: 48 }));
  });

  it('should render nothing for an open cabinet (kind NONE)', () => {
    const shapes = buildCabinetOpeningShapes(createCabinet({
      wallType: 'MAIN',
      opening: { kind: 'NONE' }
    }));

    expect(shapes).toHaveSize(0);
  });
});
