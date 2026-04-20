import { buildFloorPlanArc, buildFloorPlanArcs, CabinetOnFloorPlan } from './floor-plan-door-arcs';

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
});
