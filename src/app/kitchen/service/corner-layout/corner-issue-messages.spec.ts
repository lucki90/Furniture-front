import { CORNER_ISSUE_CODES, CornerIssue, NO_CORNER_CONSTRAINTS } from './corner-layout.model';
import {
  buildCornerZoneNotes,
  CORNER_ISSUE_MESSAGES_PL,
  cornerIssueCabinetIds,
  formatCornerIssueMessage
} from './corner-issue-messages';
import { testProject, testWall } from './corner-layout.test-fixtures';

describe('corner-issue-messages', () => {
  const labels = {
    cabinetLabel: (id: string) => `Szafka ${id.toUpperCase()}`,
    wallLabel: (type: string) => ({ MAIN: 'Główna', LEFT: 'Lewa', RIGHT: 'Prawa' } as Record<string, string>)[type] ?? type
  };

  it('każdy kod problemu ma polski szablon', () => {
    for (const code of Object.values(CORNER_ISSUE_CODES)) {
      expect(CORNER_ISSUE_MESSAGES_PL[code]).withContext(code).toBeTruthy();
    }
  });

  it('kolizja: nazwy szafek i ścian zamiast identyfikatorów', () => {
    const issue: CornerIssue = {
      code: CORNER_ISSUE_CODES.CABINETS_OVERLAP_CROSS_WALL,
      severity: 'ERROR',
      args: { cabinetId1: 'm1', wallType1: 'MAIN', cabinetId2: 'l4', wallType2: 'LEFT', level: 'BASE' }
    };

    expect(formatCornerIssueMessage(issue, labels))
      .toBe('Szafka Szafka M1 (Główna) koliduje w narożniku z szafką Szafka L4 (Lewa).');
    expect(cornerIssueCabinetIds(issue)).toEqual(['m1', 'l4']);
  });

  it('strona mechanizmu jest opisana słownie', () => {
    const issue: CornerIssue = {
      code: CORNER_ISSUE_CODES.HANDEDNESS_MISMATCH,
      severity: 'WARNING',
      args: { cabinetId: 'magic', wallType: 'MAIN', expected: 'RIGHT', actual: 'LEFT' }
    };

    expect(formatCornerIssueMessage(issue, labels)).toContain('po stronie lewej');
    expect(formatCornerIssueMessage(issue, labels)).toContain('po stronie prawej');
  });

  it('zasłonięty front wskazuje także szafkę zasłaniającą', () => {
    const issue: CornerIssue = {
      code: CORNER_ISSUE_CODES.FRONT_BLOCKED,
      severity: 'WARNING',
      args: { cabinetId: 'm1', wallType: 'MAIN', blockingCabinetId: 'l3', blockingWallType: 'LEFT' }
    };

    expect(cornerIssueCabinetIds(issue)).toEqual(['m1', 'l3']);
    expect(formatCornerIssueMessage(issue, labels)).toContain('zasłania szafka Szafka L3 (Lewa)');
  });

  describe('buildCornerZoneNotes', () => {
    const project = testProject(testWall('MAIN', 3000), testWall('LEFT', 2400), testWall('RIGHT', 2400));
    const wallOf = (id: string) => project.walls.find(wall => wall.id === id)!;

    it('opisuje strefę na prawym końcu ściany LEFT (narożnik z MAIN)', () => {
      const notes = buildCornerZoneNotes(
        wallOf('left'), { ...NO_CORNER_CONSTRAINTS, endBottomMm: 628, endTopMm: 388 }, project.topology, labels.wallLabel);

      expect(notes).toEqual(['Prawy koniec ściany: szafki ściany Główna zajmują 628 mm w strefie dolnej i 388 mm w strefie górnej.']);
    });

    it('opisuje strefę na lewym końcu ściany RIGHT', () => {
      const notes = buildCornerZoneNotes(
        wallOf('right'), { ...NO_CORNER_CONSTRAINTS, startTopMm: 388 }, project.topology, labels.wallLabel);

      expect(notes).toEqual(['Lewy koniec ściany: szafki ściany Główna zajmują 388 mm w strefie górnej.']);
    });

    it('bez stref albo bez ograniczeń → brak notatek', () => {
      expect(buildCornerZoneNotes(wallOf('main'), NO_CORNER_CONSTRAINTS, project.topology, labels.wallLabel)).toEqual([]);
      expect(buildCornerZoneNotes(wallOf('main'), undefined, project.topology, labels.wallLabel)).toEqual([]);
    });
  });
});
