import { computeCountertopRunsMm } from '../../floor-plan/floor-plan-layout.builder';
import { CornerJointSettings } from '../../model/countertop.model';
import { resolveCornerCountertopTrims } from './corner-run-trims';
import {
  base,
  CORNER_TEST_SETTINGS,
  CornerTestWall,
  lCorner,
  testProject,
  testWall
} from './corner-layout.test-fixtures';

/**
 * Przypadki wzorcowe K1–K7 łączenia blatów w narożniku — te same nazwy i wartości co backend
 * (`CountertopJointGoldenCasesTest`), patrz `_docs/plan-laczenie-blatow.md`.
 *
 * MAIN 3000 mm i LEFT 2400 mm, narożnik `MAIN.START ↔ LEFT.END`; blat 600 mm, bez naddatku bocznego. Przebieg blatu
 * to odcinek od początku pierwszego do końca ostatniego przebiegu, w mm od START ściany.
 */
describe('Łączenie blatów w narożniku — przypadki wzorcowe K1–K7', () => {
  interface Run {
    startMm: number;
    endMm: number;
  }

  const withCountertop = (item: CornerTestWall, cornerJoint?: CornerJointSettings): CornerTestWall => ({
    ...item,
    wall: { ...item.wall, countertopConfig: { enabled: true, sideOverhangExtraMm: 0, cornerJoint } }
  });

  const runsOf = (...walls: CornerTestWall[]): Map<string, Run | null> => {
    const project = testProject(...walls);
    const trims = resolveCornerCountertopTrims(
      project.topology, project.walls, project.positionsByWallId, CORNER_TEST_SETTINGS);
    return new Map(project.walls.map(wall => {
      const runs = computeCountertopRunsMm(
        wall, project.positionsByWallId.get(wall.id) ?? [], CORNER_TEST_SETTINGS.enclosureFillerWidthMm,
        trims.get(wall.id));
      const run = runs.length > 0 ? { startMm: runs[0].startMm, endMm: runs[runs.length - 1].endMm } : null;
      return [wall.id, run];
    }));
  };

  const mainWithCornerCabinet = () => withCountertop(testWall('MAIN', 3000, base('m1', 0, 600), base('m2', 600, 600)));
  const mainWithLCorner = () => withCountertop(testWall('MAIN', 3000, lCorner('mc', 0, 900, 900), base('m2', 900, 600)));
  const leftBeforeCornerZone = (cornerJoint?: CornerJointSettings) =>
    withCountertop(testWall('LEFT', 2400, base('l1', 1172, 600)), cornerJoint);

  it('K1: łyżwa — blat MAIN do ściany, LEFT do krawędzi blatu MAIN', () => {
    const runs = runsOf(mainWithCornerCabinet(), leftBeforeCornerZone());

    expect(runs.get('main')).toEqual({ startMm: 0, endMm: 1200 });
    expect(runs.get('left')).toEqual({ startMm: 1172, endMm: 1800 });
  });

  it('K2: łyżwa, przechodzi blat LEFT — LEFT do ściany, MAIN od krawędzi blatu LEFT', () => {
    const runs = runsOf(mainWithCornerCabinet(), leftBeforeCornerZone({ passThrough: 'THIS_WALL' }));

    expect(runs.get('left')).toEqual({ startMm: 1172, endMm: 2400 });
    expect(runs.get('main')).toEqual({ startMm: 600, endMm: 1200 });
  });

  it('K3: cięcie 45° — oba blaty dochodzą do ściany', () => {
    const runs = runsOf(mainWithCornerCabinet(), leftBeforeCornerZone({ type: 'MITER_45' }));

    expect(runs.get('main')).toEqual({ startMm: 0, endMm: 1200 });
    expect(runs.get('left')).toEqual({ startMm: 1172, endMm: 2400 });
  });

  it('K4: szafka L na MAIN, LEFT bez szafek — blat LEFT nad ramieniem do krawędzi blatu MAIN', () => {
    const runs = runsOf(mainWithLCorner(), withCountertop(testWall('LEFT', 2400)));

    expect(runs.get('main')).toEqual({ startMm: 0, endMm: 1500 });
    expect(runs.get('left')).toEqual({ startMm: 1500, endMm: 1800 });
  });

  it('K4b: jak K4, cięcie 45° — blat LEFT nad całym ramieniem do ściany', () => {
    const runs = runsOf(mainWithLCorner(), withCountertop(testWall('LEFT', 2400), { type: 'MITER_45' }));

    expect(runs.get('left')).toEqual({ startMm: 1500, endMm: 2400 });
  });

  it('K5: szafka L na MAIN, szafki LEFT daleko — jeden przebieg LEFT od szafek do krawędzi blatu MAIN', () => {
    const runs = runsOf(mainWithLCorner(), withCountertop(testWall('LEFT', 2400, base('l1', 0, 600))));

    expect(runs.get('left')).toEqual({ startMm: 0, endMm: 1800 });
  });

  it('K6: listwa aluminiowa — geometria jak K1', () => {
    const runs = runsOf(mainWithCornerCabinet(), leftBeforeCornerZone({ type: 'ALUMINUM_STRIP' }));

    expect(runs.get('main')).toEqual({ startMm: 0, endMm: 1200 });
    expect(runs.get('left')).toEqual({ startMm: 1172, endMm: 1800 });
  });

  it('K7: stary projekt bez cornerJoint — wynik jak w planie narożników', () => {
    const legacyLeft = testWall('LEFT', 2400, base('l1', 1172, 600));
    const runs = runsOf(mainWithCornerCabinet(), {
      ...legacyLeft,
      wall: { ...legacyLeft.wall, countertopConfig: { enabled: true, sideOverhangExtraMm: 0 } }
    });

    expect(runs.get('main')).toEqual({ startMm: 0, endMm: 1200 });
    expect(runs.get('left')).toEqual({ startMm: 1172, endMm: 1800 });
  });
});
