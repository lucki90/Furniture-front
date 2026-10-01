import {
  isReversedAlongPlanY,
  planEndForElevationSide,
  planSpanAlongY,
  verticalSegmentTopPx
} from './floor-plan-orientation';

describe('floor-plan-orientation', () => {
  it('odwraca kierunek wzdłuż osi Y tylko dla ściany RIGHT', () => {
    expect(isReversedAlongPlanY('RIGHT')).toBeTrue();
    expect(isReversedAlongPlanY('LEFT')).toBeFalse();
    expect(isReversedAlongPlanY('MAIN')).toBeFalse();
  });

  it('ściana LEFT: odcinek od START ściany leży od górnej krawędzi ściany', () => {
    expect(verticalSegmentTopPx('LEFT', 100, 300, 20, 60)).toBe(120);
  });

  it('ściana RIGHT: odcinek od START ściany leży od dolnej krawędzi (narożnik z MAIN)', () => {
    // ściana 100..400 px; odcinek 20..80 px od START → na ekranie 320..380
    expect(verticalSegmentTopPx('RIGHT', 100, 300, 20, 60)).toBe(320);
    expect(verticalSegmentTopPx('RIGHT', 100, 300, 0, 60)).toBe(340);
  });

  it('przelicza pod-przedział frontu na ułamki wzdłuż osi Y', () => {
    expect(planSpanAlongY('LEFT', 0.2, 0.6)).toEqual({ top: 0.2, bottom: 0.6 });
    const reversed = planSpanAlongY('RIGHT', 0.2, 0.6);
    expect(reversed.top).toBeCloseTo(0.4, 10);
    expect(reversed.bottom).toBeCloseTo(0.8, 10);
  });

  it('przelicza stronę elewacji na koniec prostokąta szafki na rzucie', () => {
    expect(planEndForElevationSide('LEFT', 'LEFT')).toBe('START');
    expect(planEndForElevationSide('LEFT', 'RIGHT')).toBe('END');
    expect(planEndForElevationSide('RIGHT', 'LEFT')).toBe('END');
    expect(planEndForElevationSide('RIGHT', 'RIGHT')).toBe('START');
  });
});
