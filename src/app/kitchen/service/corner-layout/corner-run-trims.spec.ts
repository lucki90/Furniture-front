import { CountertopConfig } from '../../model/kitchen-state.model';
import { resolveCornerCountertopTrims } from './corner-run-trims';
import {
  base,
  blindCorner,
  CORNER_TEST_SETTINGS,
  CornerTestWall,
  lCorner,
  tall,
  testProject,
  testWall
} from './corner-layout.test-fixtures';

/**
 * Przycięcia blatu w narożniku — te same przypadki co backend (`CornerRunTrimResolverTest`). Ściany: MAIN 3000 mm
 * i LEFT 2400 mm, narożnik `MAIN.START ↔ LEFT.END`; szafki dolne 560 mm (zasięg 578), narożne 510 mm (zasięg 528).
 */
describe('resolveCornerCountertopTrims', () => {
  const withCountertop = (item: CornerTestWall, config: Partial<CountertopConfig> = {}): CornerTestWall => ({
    ...item,
    wall: { ...item.wall, countertopConfig: { enabled: true, ...config } as CountertopConfig }
  });

  const trimsOf = (...walls: CornerTestWall[]) => {
    const project = testProject(...walls);
    return resolveCornerCountertopTrims(project.topology, project.walls, project.positionsByWallId, CORNER_TEST_SETTINGS);
  };

  it('szafka MAIN w narożniku, LEFT za luzem narożnym: blat MAIN do ściany, LEFT do krawędzi blatu MAIN', () => {
    const trims = trimsOf(
      withCountertop(testWall('MAIN', 3000, base('m1', 0, 600), base('m2', 600, 600))),
      withCountertop(testWall('LEFT', 2400, base('l1', 1172, 600)))
    );

    expect(trims.get('main')).toEqual({ startMm: 0 });
    expect(trims.get('left')).toEqual({ endMm: 1800 });
  });

  it('szafki ściany dostawionej daleko od narożnika — bez przycięć', () => {
    const trims = trimsOf(
      withCountertop(testWall('MAIN', 3000, base('m1', 0, 600))),
      withCountertop(testWall('LEFT', 2400, base('l1', 0, 600)))
    );

    expect(trims.size).toBe(0);
  });

  it('narożnik L: ramię B jest podparciem blatu LEFT, który kończy się na krawędzi blatu MAIN', () => {
    const trims = trimsOf(
      withCountertop(testWall('MAIN', 3000, lCorner('mc', 0, 900, 900), base('m2', 900, 600))),
      withCountertop(testWall('LEFT', 2400, base('l1', 900, 600)))
    );

    expect(trims.get('main')).toEqual({ startMm: 0 });
    expect(trims.get('left')).toEqual({ endMm: 1800, supports: [{ startMm: 1500, endMm: 2400 }] });
  });

  it('ślepy narożnik: blat LEFT kończy się na krawędzi blatu MAIN nad częścią ślepą', () => {
    const trims = trimsOf(
      withCountertop(testWall('MAIN', 3000, blindCorner('mb', 0, 1000, 500))),
      withCountertop(testWall('LEFT', 2400, base('l1', 1272, 600)))
    );

    expect(trims.get('left')).toEqual({ endMm: 1800 });
  });

  it('szafka L ostatnia na LEFT: LEFT jest właścicielem, blat MAIN zaczyna się na krawędzi blatu LEFT', () => {
    const trims = trimsOf(
      withCountertop(testWall('MAIN', 3000, base('m1', 900, 600))),
      withCountertop(testWall('LEFT', 2400, base('l1', 0, 600), lCorner('lc', 1500, 900, 900)))
    );

    expect(trims.get('left')).toEqual({ endMm: 2400 });
    expect(trims.get('main')).toEqual({ startMm: 600, supports: [{ startMm: 0, endMm: 900 }] });
  });

  it('narożnik MAIN.END ↔ RIGHT.START: blat MAIN do końca ściany, RIGHT od krawędzi blatu MAIN', () => {
    const trims = trimsOf(
      withCountertop(testWall('MAIN', 3000, base('m1', 2400, 600))),
      withCountertop(testWall('RIGHT', 2400, base('r1', 628, 600)))
    );

    expect(trims.get('main')).toEqual({ endMm: 3000 });
    expect(trims.get('right')).toEqual({ startMm: 600 });
  });

  it('ręczna głębokość blatu właściciela wyznacza koniec blatu ściany dostawionej', () => {
    const trims = trimsOf(
      withCountertop(testWall('MAIN', 3000, base('m1', 0, 600)), { manualDepthMm: 650 }),
      withCountertop(testWall('LEFT', 2400, base('l1', 1172, 600)))
    );

    expect(trims.get('left')).toEqual({ endMm: 1750 });
  });

  it('wyłączony blat którejś ściany albo słupek w narożniku — bez przycięć', () => {
    const disabled = trimsOf(
      withCountertop(testWall('MAIN', 3000, base('m1', 0, 600))),
      testWall('LEFT', 2400, base('l1', 1172, 600))
    );
    const tallAtCorner = trimsOf(
      withCountertop(testWall('MAIN', 3000, tall('t1', 0, 600), base('m2', 600, 600))),
      withCountertop(testWall('LEFT', 2400, base('l1', 1172, 600)))
    );

    expect(disabled.size).toBe(0);
    expect(tallAtCorner.size).toBe(0);
  });
});
