import { WallWithCabinets } from '../../model/kitchen-state.model';
import { KitchenGeometryService, KitchenGeometrySettings } from '../kitchen-geometry.service';
import { CORNER_ISSUE_CODES, NO_CORNER_CONSTRAINTS } from './corner-layout.model';
import { buildProjectCornerLayout, ProjectCornerLayout } from './project-corner-layout.builder';
import {
  base,
  blindCorner,
  CORNER_TEST_SETTINGS,
  lCorner,
  PlacedCabinet,
  tall,
  testWall,
  upper,
  upperBlindCorner
} from './corner-layout.test-fixtures';
import { WallType } from '../../model/kitchen-project.model';

describe('buildProjectCornerLayout', () => {
  const geometrySettings: KitchenGeometrySettings = {
    wallHeightMm: 2600,
    plinthHeightMm: 100,
    countertopThicknessMm: 38,
    upperFillerHeightMm: 0,
    fillerWidthMm: 50
  };

  /** Ściana z szafkami w podanej kolejności; pozycje liczy układ, więc `x` z fixture'a jest pomijane. */
  const wall = (type: WallType, widthMm: number, ...cabinets: PlacedCabinet[]): WallWithCabinets =>
    testWall(type, widthMm, ...cabinets).wall;

  const layout = (...walls: WallWithCabinets[]): ProjectCornerLayout =>
    buildProjectCornerLayout(walls, () => geometrySettings, CORNER_TEST_SETTINGS);

  const xs = (result: ProjectCornerLayout, wallId: string): number[] =>
    (result.positionsByWallId.get(wallId) ?? []).map(position => position.x);

  const errors = (result: ProjectCornerLayout) => result.issues.filter(issue => issue.severity === 'ERROR');

  it('projekt bez narożników → brak ograniczeń, pozycje jak dotąd', () => {
    const main = wall('MAIN', 3000, base('m1', 0, 600), base('m2', 0, 600));
    const result = layout(main);

    expect(result.constraintsByWallId.size).toBe(0);
    expect(xs(result, 'main')).toEqual(
      new KitchenGeometryService().calculateLinearCabinetPositions(main.cabinets, geometrySettings).map(position => position.x));
  });

  it('G1: szafka przy MAIN.START → strefa LEFT.END 628; przepełniona LEFT zgłasza kolizję', () => {
    const result = layout(
      wall('MAIN', 3000, base('m1', 0, 600)),
      wall('LEFT', 2400, base('l1', 0, 600), base('l2', 0, 600), base('l3', 0, 600), base('l4', 0, 600))
    );

    expect(result.constraintsByWallId.get('left')).toEqual({ ...NO_CORNER_CONSTRAINTS, endBottomMm: 628 });
    expect(xs(result, 'left')).toEqual([0, 600, 1200, 1800]);
    expect(errors(result).map(issue => issue.code)).toEqual([CORNER_ISSUE_CODES.CABINETS_OVERLAP_CROSS_WALL]);
  });

  it('G5: szafki MAIN do końca ściany → RIGHT zaczyna się od 628 mm i nie koliduje', () => {
    const result = layout(
      wall('MAIN', 3000, base('m1', 0, 600), base('m2', 0, 600), base('m3', 0, 600), base('m4', 0, 600), base('m5', 0, 600)),
      wall('RIGHT', 2400, base('r1', 0, 600), base('r2', 0, 600))
    );

    expect(result.constraintsByWallId.get('right')?.startBottomMm).toBe(628);
    expect(xs(result, 'right')).toEqual([628, 1228]);
    expect(errors(result)).toEqual([]);
  });

  it('G3: narożnik L 900/900 na MAIN → strefa LEFT.END 900', () => {
    const result = layout(
      wall('MAIN', 3000, lCorner('l-corner', 0, 900, 900), base('m2', 0, 600)),
      wall('LEFT', 2400, base('l1', 0, 600), base('l2', 0, 600))
    );

    expect(result.constraintsByWallId.get('left')?.endBottomMm).toBe(900);
    expect(errors(result)).toEqual([]);
  });

  it('szafka L ostatnia na LEFT → LEFT jest właścicielem: szafka przypięta do narożnika, MAIN startuje za ramieniem', () => {
    const result = layout(
      wall('MAIN', 3000, base('m1', 0, 600), base('m2', 0, 600)),
      wall('LEFT', 2400, base('l1', 0, 600), lCorner('l-corner', 0, 900, 900))
    );

    expect(result.constraintsByWallId.get('left')?.pinnedEndCabinetIds).toEqual(['l-corner']);
    expect(xs(result, 'left')).toEqual([0, 1500]);
    expect(result.constraintsByWallId.get('main')?.startBottomMm).toBe(900);
    expect(xs(result, 'main')).toEqual([900, 1500]);
    expect(errors(result)).toEqual([]);
  });

  it('G7: górny ślepy narożnik na MAIN → strefa górna LEFT.END 338, dolna 0', () => {
    const result = layout(
      wall('MAIN', 3000, upperBlindCorner('blind-up', 0, 800, 400)),
      wall('LEFT', 2400, base('l1', 0, 600), upper('l-up', 0, 600))
    );

    expect(result.constraintsByWallId.get('left')).toEqual({ ...NO_CORNER_CONSTRAINTS, endTopMm: 338 });
  });

  it('G8: same szafki wiszące przy MAIN.END → słupek na RIGHT omija strefę górną: x = 388', () => {
    const result = layout(
      wall('MAIN', 3000, upper('u1', 0, 600), upper('u2', 0, 600), upper('u3', 0, 600), upper('u4', 0, 600), upper('u5', 0, 600)),
      wall('RIGHT', 2400, tall('t1', 0, 600), base('r1', 0, 600))
    );

    expect(result.constraintsByWallId.get('right')).toEqual({ ...NO_CORNER_CONSTRAINTS, startTopMm: 388 });
    expect(xs(result, 'right')).toEqual([388, 988]);
  });

  it('układ U: strefa z LEFT przesuwa MAIN, a koniec MAIN wyznacza strefę RIGHT', () => {
    const result = layout(
      wall('LEFT', 2400, base('l1', 0, 600), blindCorner('blind', 0, 1000, 350)),
      wall('MAIN', 3000, base('m1', 0, 600), base('m2', 0, 600), base('m3', 0, 600), base('m4', 0, 600)),
      wall('RIGHT', 2400, base('r1', 0, 600))
    );

    expect(xs(result, 'left')).toEqual([0, 1400]);
    expect(result.constraintsByWallId.get('main')?.startBottomMm).toBe(528);
    expect(xs(result, 'main')).toEqual([528, 1128, 1728, 2328]);
    expect(result.constraintsByWallId.get('right')?.startBottomMm).toBe(628);
    expect(xs(result, 'right')).toEqual([628]);
    expect(errors(result)).toEqual([]);
  });

  it('wyspa nie dostaje ograniczeń narożnych', () => {
    const result = layout(
      wall('MAIN', 3000, base('m1', 0, 600)),
      wall('LEFT', 2400, base('l1', 0, 600)),
      wall('ISLAND', 2000, base('i1', 0, 600))
    );

    expect(result.constraintsByWallId.has('island')).toBeFalse();
    expect(result.positionsByWallId.has('island')).toBeFalse();
  });
});
