import { resolveCornerJunctionSide, resolveCornerJunctionSides } from './corner-junction-side.resolver';
import { base, CORNER_TEST_SETTINGS, CornerTestProject, lCorner, testProject, testWall } from './corner-layout.test-fixtures';

describe('resolveCornerJunctionSides', () => {
  const sidesOf = (project: CornerTestProject) =>
    resolveCornerJunctionSides(project.topology, project.walls, project.positionsByWallId, CORNER_TEST_SETTINGS);

  it('szafka narożna przy START ściany styka się po lewej, przy END — po prawej', () => {
    const project = testProject(
      testWall('MAIN', 3000, lCorner('start', 0, 900, 900), lCorner('end', 2100, 900, 900)),
      testWall('LEFT', 2400),
      testWall('RIGHT', 2400)
    );

    const sides = sidesOf(project);

    expect(sides.get('start')).toBe('LEFT');
    expect(sides.get('end')).toBe('RIGHT');
  });

  it('ściana dostawiona: szafka narożna przy END ściany LEWEJ styka się po prawej', () => {
    const project = testProject(
      testWall('MAIN', 3000, base('m1', 1200, 600)),
      testWall('LEFT', 2400, lCorner('lc', 1500, 900, 900))
    );

    expect(sidesOf(project).get('lc')).toBe('RIGHT');
  });

  it('szafka narożna z dala od narożnika i zwykłe szafki nie mają wpisu', () => {
    const project = testProject(
      testWall('MAIN', 3000, base('m1', 0, 600), lCorner('mid', 1000, 900, 900)),
      testWall('LEFT', 2400)
    );

    expect(sidesOf(project).size).toBe(0);
  });
});

describe('resolveCornerJunctionSide', () => {
  it('strona z topologii ma pierwszeństwo przed położeniem', () => {
    const sides = new Map([['c1', 'RIGHT' as const]]);

    expect(resolveCornerJunctionSide('c1', sides, { x: 0, width: 90, wallWidth: 500 })).toBe('RIGHT');
  });

  it('bez narożnika w topologii strona wynika ze środka szafki względem połowy ściany', () => {
    expect(resolveCornerJunctionSide('c1', undefined, { x: 0, width: 90, wallWidth: 500 })).toBe('LEFT');
    expect(resolveCornerJunctionSide('c1', new Map(), { x: 410, width: 90, wallWidth: 500 })).toBe('RIGHT');
  });
});
