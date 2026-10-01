import { CornerGhost, NO_CORNER_CONSTRAINTS } from './corner-layout.model';
import { buildCornerGhosts, buildCornerReservedZones } from './corner-ghosts.builder';
import { detectCornerIssues } from './corner-issues.detector';
import {
  base,
  blindCorner,
  CORNER_TEST_SETTINGS,
  CornerTestProject,
  lCorner,
  tall,
  testProject,
  testWall,
  upper
} from './corner-layout.test-fixtures';

describe('buildCornerGhosts', () => {
  const ghostsOf = (project: CornerTestProject, withIssues = false): CornerGhost[] => {
    const issues = withIssues
      ? detectCornerIssues(project.walls, project.topology, project.positionsByWallId, CORNER_TEST_SETTINGS)
      : [];
    return buildCornerGhosts(project.topology, project.walls, project.positionsByWallId, issues, CORNER_TEST_SETTINGS);
  };

  const summary = (ghost: CornerGhost) => ({
    wallId: ghost.wallId,
    cabinetId: ghost.cabinet.id,
    kind: ghost.kind,
    startMm: ghost.startMm,
    endMm: ghost.endMm
  });

  it('ściana dostawiona widzi bok szafki właściciela w strefie narożnej; dalsze szafki są poza przekrojem', () => {
    const project = testProject(
      testWall('MAIN', 3000, base('m1', 0, 600), base('m2', 600, 600)),
      testWall('LEFT', 2400, base('l1', 0, 600))
    );

    const ghosts = ghostsOf(project);

    expect(ghosts.map(summary)).toEqual([
      { wallId: 'left', cabinetId: 'm1', kind: 'SIDE_PROFILE', startMm: 1822, endMm: 2400 }
    ]);
    expect(ghosts[0].wallEnd).toBe('END');
    expect(ghosts[0].sourceWallType).toBe('MAIN');
    expect(ghosts[0].frontStartMm).toBeNull();
    expect(ghosts[0].conflict).toBeFalse();
  });

  it('szafka L właściciela pokazuje na ścianie dostawionej całe ramię z frontem za kwadratem narożnym', () => {
    const project = testProject(
      testWall('MAIN', 3000, lCorner('mc', 0, 900, 900)),
      testWall('LEFT', 2400)
    );

    const [ghost] = ghostsOf(project);

    expect(summary(ghost)).toEqual({ wallId: 'left', cabinetId: 'mc', kind: 'L_ARM', startMm: 1500, endMm: 2400 });
    expect([ghost.frontStartMm, ghost.frontEndMm]).toEqual([1500, 1872]);
  });

  it('ślepy narożnik: szafka sąsiedniej ściany zasłaniająca część ślepą jest widoczna na ścianie właściciela', () => {
    const project = testProject(
      testWall('MAIN', 3000, blindCorner('mb', 0, 1000, 500)),
      testWall('LEFT', 2400, base('l1', 1272, 600))
    );

    const ghosts = ghostsOf(project).map(summary);

    expect(ghosts).toContain({ wallId: 'main', cabinetId: 'l1', kind: 'SIDE_PROFILE', startMm: 0, endMm: 578 });
    expect(ghosts).toContain({ wallId: 'left', cabinetId: 'mb', kind: 'SIDE_PROFILE', startMm: 1872, endMm: 2400 });
  });

  it('szafka ściany dostawionej za luzem narożnym jest poza przekrojem ściany właściciela', () => {
    const project = testProject(
      testWall('MAIN', 3000, base('m1', 0, 600)),
      testWall('LEFT', 2400, base('l1', 1172, 600))
    );

    expect(ghostsOf(project).map(ghost => ghost.wallId)).toEqual(['left']);
  });

  it('ściana bez szafek górnych widzi szafkę górną stojącą w narożniku', () => {
    const project = testProject(
      testWall('MAIN', 3000, upper('u1', 0, 600), upper('u2', 600, 600)),
      testWall('LEFT', 2400, base('l1', 0, 600))
    );

    expect(ghostsOf(project).map(summary)).toEqual([
      { wallId: 'left', cabinetId: 'u1', kind: 'SIDE_PROFILE', startMm: 2062, endMm: 2400 }
    ]);
  });

  it('słupek należący do obu poziomów daje jeden cień', () => {
    const project = testProject(
      testWall('MAIN', 3000, tall('t1', 0, 600)),
      testWall('LEFT', 2400, base('l1', 0, 600), upper('lu1', 0, 600))
    );

    expect(ghostsOf(project).map(ghost => ghost.cabinet.id)).toEqual(['t1']);
  });

  it('narożnik MAIN.END ↔ RIGHT.START: cień na początku ściany PRAWEJ', () => {
    const project = testProject(
      testWall('MAIN', 3000, base('m1', 2400, 600)),
      testWall('RIGHT', 2400, base('r1', 700, 600))
    );

    const [ghost] = ghostsOf(project);

    expect(summary(ghost)).toEqual({ wallId: 'right', cabinetId: 'm1', kind: 'SIDE_PROFILE', startMm: 0, endMm: 578 });
    expect(ghost.wallEnd).toBe('START');
  });

  it('szafki kolidujące w narożniku są oznaczone na obu elewacjach', () => {
    const project = testProject(
      testWall('MAIN', 3000, base('m1', 0, 600)),
      testWall('LEFT', 2400, base('l1', 1800, 600))
    );

    const ghosts = ghostsOf(project, true);

    expect(ghosts.map(ghost => [ghost.wallId, ghost.cabinet.id, ghost.conflict])).toEqual([
      ['main', 'l1', true],
      ['left', 'm1', true]
    ]);
  });

  it('projekt bez narożników nie ma cieni', () => {
    const project = testProject(testWall('MAIN', 3000, base('m1', 0, 600)));

    expect(ghostsOf(project)).toEqual([]);
  });
});

describe('buildCornerReservedZones', () => {
  it('zamienia dodatnie strefy narożne na odcinki ściany, osobno dla dołu i góry', () => {
    const left = testWall('LEFT', 2400).wall;
    const constraints = new Map([[left.id, { ...NO_CORNER_CONSTRAINTS, startBottomMm: 628, endTopMm: 338 }]]);

    expect(buildCornerReservedZones([left], constraints)).toEqual([
      { wallId: 'left', wallEnd: 'START', level: 'BASE', startMm: 0, endMm: 628 },
      { wallId: 'left', wallEnd: 'END', level: 'UPPER', startMm: 2062, endMm: 2400 }
    ]);
  });

  it('pomija ograniczenia nieznanej ściany', () => {
    const constraints = new Map([['missing', { ...NO_CORNER_CONSTRAINTS, startBottomMm: 628 }]]);

    expect(buildCornerReservedZones([], constraints)).toEqual([]);
  });
});
