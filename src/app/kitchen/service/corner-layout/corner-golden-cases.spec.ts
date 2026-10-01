import { CORNER_ISSUE_CODES, CornerIssue } from './corner-layout.model';
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
  upper,
  upperBlindCorner
} from './corner-layout.test-fixtures';

/**
 * Przypadki wzorcowe narożnika — lustro `CornerIssueDetectorTest` po stronie backendu.
 * Zmiana oczekiwań w jednym miejscu wymaga tej samej zmiany w drugim.
 */
describe('przypadki wzorcowe narożnika — detectCornerIssues', () => {
  const detect = (project: CornerTestProject): CornerIssue[] =>
    detectCornerIssues(project.walls, project.topology, project.positionsByWallId, CORNER_TEST_SETTINGS);

  const error = (code: CornerIssue['code'], id1: string, wall1: string, id2: string, wall2: string, level: string): CornerIssue => ({
    code,
    severity: 'ERROR',
    args: { cabinetId1: id1, wallType1: wall1, cabinetId2: id2, wallType2: wall2, level }
  });

  const warning = (code: CornerIssue['code'], args: Record<string, string>): CornerIssue => ({
    code,
    severity: 'WARNING',
    args
  });

  describe('narożnik bez szafki narożnej', () => {
    it('G1: cztery szafki 600 na LEFT 2400 → ostatnia koliduje z pierwszą szafką MAIN', () => {
      const issues = detect(testProject(
        testWall('MAIN', 3000, base('m1', 0, 600)),
        testWall('LEFT', 2400, base('l1', 0, 600), base('l2', 600, 600), base('l3', 1200, 600), base('l4', 1800, 600))
      ));

      expect(issues).toEqual([
        error(CORNER_ISSUE_CODES.CABINETS_OVERLAP_CROSS_WALL, 'm1', 'MAIN', 'l4', 'LEFT', 'BASE'),
        warning(CORNER_ISSUE_CODES.CLEARANCE_TOO_SMALL, { cabinetId: 'l3', wallType: 'LEFT', requiredMm: '628', actualMm: '600' }),
        warning(CORNER_ISSUE_CODES.FRONT_BLOCKED, {
          cabinetId: 'm1', wallType: 'MAIN', blockingCabinetId: 'l3', blockingWallType: 'LEFT'
        })
      ]);
    });

    it('G2: trzy szafki na LEFT → bez kolizji, ale za mały luz i zasłonięty front szafki MAIN', () => {
      const issues = detect(testProject(
        testWall('MAIN', 3000, base('m1', 0, 600)),
        testWall('LEFT', 2400, base('l1', 0, 600), base('l2', 600, 600), base('l3', 1200, 600))
      ));

      expect(issues.some(issue => issue.severity === 'ERROR')).toBeFalse();
      expect(issues.map(issue => issue.code)).toEqual([
        CORNER_ISSUE_CODES.CLEARANCE_TOO_SMALL,
        CORNER_ISSUE_CODES.FRONT_BLOCKED
      ]);
    });

    it('szafka LEFT za strefą narożną (zasięg + luz) → bez kolizji i luzu; front MAIN w martwym narożniku', () => {
      const issues = detect(testProject(
        testWall('MAIN', 3000, base('m1', 0, 600)),
        testWall('LEFT', 2400, base('l1', 2400 - 628 - 600, 600))
      ));

      expect(issues.map(issue => issue.code)).toEqual([CORNER_ISSUE_CODES.FRONT_BLOCKED]);
    });

    it('G5: narożnik prawy — szafka przy MAIN.END koliduje z pierwszą szafką RIGHT', () => {
      const issues = detect(testProject(
        testWall('MAIN', 3000, base('m-end', 2400, 600)),
        testWall('RIGHT', 2400, base('r1', 0, 600))
      ));

      expect(issues).toEqual([
        error(CORNER_ISSUE_CODES.CABINETS_OVERLAP_CROSS_WALL, 'm-end', 'MAIN', 'r1', 'RIGHT', 'BASE')
      ]);
    });

    it('słupki z obu ścian w narożniku → jedna kolizja mimo dwóch poziomów', () => {
      const issues = detect(testProject(
        testWall('MAIN', 3000, tall('m-tall', 0, 600)),
        testWall('LEFT', 2400, tall('l-tall', 1800, 600))
      ));

      expect(issues).toEqual([
        error(CORNER_ISSUE_CODES.CABINETS_OVERLAP_CROSS_WALL, 'm-tall', 'MAIN', 'l-tall', 'LEFT', 'BASE')
      ]);
    });

    it('szafki wiszące kolidują tylko z wiszącymi', () => {
      const issues = detect(testProject(
        testWall('MAIN', 3000, upper('m-up', 0, 600)),
        testWall('LEFT', 2400, base('l-base', 1800, 600), upper('l-up', 1800, 600))
      ));

      expect(issues).toEqual([
        error(CORNER_ISSUE_CODES.CABINETS_OVERLAP_CROSS_WALL, 'm-up', 'MAIN', 'l-up', 'LEFT', 'UPPER')
      ]);
    });
  });

  describe('szafka narożna typu A (L)', () => {
    it('G3: ramię B narożnika L 900/900 koliduje z szafką LEFT bliżej niż 900 mm od narożnika', () => {
      const issues = detect(testProject(
        testWall('MAIN', 3000, lCorner('l-corner', 0, 900, 900)),
        testWall('LEFT', 2400, base('l1', 1500, 600))
      ));

      expect(issues).toEqual([
        error(CORNER_ISSUE_CODES.CABINETS_OVERLAP_CROSS_WALL, 'l-corner', 'MAIN', 'l1', 'LEFT', 'BASE')
      ]);
    });

    it('G3: szafka LEFT zaczynająca się za ramieniem B → brak problemów', () => {
      const issues = detect(testProject(
        testWall('MAIN', 3000, lCorner('l-corner', 0, 900, 900)),
        testWall('LEFT', 2400, base('l1', 900, 600))
      ));

      expect(issues).toEqual([]);
    });

    it('G6: szafki narożne po obu stronach narożnika → błąd duplikatu zamiast kolizji', () => {
      const issues = detect(testProject(
        testWall('MAIN', 3000, lCorner('l-corner', 0, 900, 900)),
        testWall('LEFT', 2400, blindCorner('blind', 1400, 1000, 450))
      ));

      expect(issues).toEqual([
        error(CORNER_ISSUE_CODES.CORNER_CABINET_DUPLICATE, 'l-corner', 'MAIN', 'blind', 'LEFT', 'BASE')
      ]);
    });
  });

  describe('szafka narożna typu B (ślepa)', () => {
    it('G4: ślepy narożnik 1000 (front 450) obok szafki 560 → ślepa część za krótka: 632 > 550', () => {
      const issues = detect(testProject(
        testWall('MAIN', 3000, blindCorner('blind', 0, 1000, 450)),
        testWall('LEFT', 2400, base('l1', 2400 - 528 - 600, 600))
      ));

      expect(issues).toEqual([
        warning(CORNER_ISSUE_CODES.BLIND_PART_TOO_SHORT, {
          cabinetId: 'blind', wallType: 'MAIN', requiredMm: '632', actualMm: '550'
        })
      ]);
    });

    it('ślepa część wystarczająca (front 350) → brak problemów', () => {
      const issues = detect(testProject(
        testWall('MAIN', 3000, blindCorner('blind', 0, 1000, 350)),
        testWall('LEFT', 2400, base('l1', 2400 - 528 - 600, 600))
      ));

      expect(issues).toEqual([]);
    });

    it('brak szafki przed ślepą częścią → ostrzeżenie o odsłoniętym froncie ślepym', () => {
      const issues = detect(testProject(
        testWall('MAIN', 3000, blindCorner('blind', 0, 1000, 350)),
        testWall('LEFT', 2400)
      ));

      expect(issues).toEqual([
        warning(CORNER_ISSUE_CODES.BLIND_UNCOVERED, { cabinetId: 'blind', wallType: 'MAIN', level: 'BASE' })
      ]);
    });

    it('ślepy narożnik na ścianie B (LEFT.END) zasłaniany przez szafkę MAIN', () => {
      const issues = detect(testProject(
        testWall('MAIN', 3000, base('m1', 528, 600)),
        testWall('LEFT', 2400, blindCorner('blind', 1400, 1000, 350))
      ));

      expect(issues).toEqual([]);
    });

    it('Magic Corner z frontem po stronie narożnika → niezgodna strona mechanizmu', () => {
      const issues = detect(testProject(
        testWall('MAIN', 3000, blindCorner('magic', 0, 1000, 350, {
          cornerMechanism: 'MAGIC_CORNER_COMFORT',
          cornerHandedness: 'LEFT'
        })),
        testWall('LEFT', 2400, base('l1', 2400 - 528 - 600, 600))
      ));

      expect(issues).toEqual([
        warning(CORNER_ISSUE_CODES.HANDEDNESS_MISMATCH, {
          cabinetId: 'magic', wallType: 'MAIN', expected: 'RIGHT', actual: 'LEFT'
        })
      ]);
    });

    it('G7: górny ślepy narożnik 320 zasłaniany przez szafkę wiszącą LEFT → brak problemów', () => {
      const issues = detect(testProject(
        testWall('MAIN', 3000, upperBlindCorner('blind-up', 0, 800, 400)),
        testWall('LEFT', 2400, upper('l-up', 2400 - 338 - 600, 600))
      ));

      expect(issues).toEqual([]);
    });
  });

  it('szafka narożna w środku ściany → ostrzeżenie; przy wolnym końcu ściany — bez ostrzeżenia', () => {
    const issues = detect(testProject(
      testWall('MAIN', 3000, blindCorner('middle', 1000, 1000, 350)),
      testWall('LEFT', 2400, blindCorner('free-end', 0, 1000, 350))
    ));

    expect(issues).toEqual([
      warning(CORNER_ISSUE_CODES.CORNER_CABINET_NOT_AT_CORNER, { cabinetId: 'middle', wallType: 'MAIN', offsetMm: '1000' })
    ]);
  });

  it('projekt bez narożników → brak problemów', () => {
    expect(detect(testProject(testWall('MAIN', 3000, base('m1', 0, 600))))).toEqual([]);
  });
});
