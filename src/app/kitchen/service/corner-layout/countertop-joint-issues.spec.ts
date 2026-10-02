import { CountertopConfig } from '../../model/kitchen-state.model';
import { resolveCornerCountertopLayout } from './corner-run-trims';
import { detectCountertopJointIssues } from './countertop-joint-issues';
import { formatCornerIssueMessage } from './corner-issue-messages';
import { base, CORNER_TEST_SETTINGS, CornerTestWall, testProject, testWall } from './corner-layout.test-fixtures';

/**
 * Ostrzeżenia połączeń blatów — te same przypadki co backend (`CountertopJointValidatorTest`). MAIN z szafką przy
 * narożniku i LEFT z szafką przed strefą narożną: blaty się łączą.
 */
describe('detectCountertopJointIssues', () => {
  const withCountertop = (item: CornerTestWall, config: Partial<CountertopConfig> = {}): CornerTestWall => ({
    ...item,
    wall: { ...item.wall, countertopConfig: { enabled: true, ...config } }
  });

  const issuesOf = (main: Partial<CountertopConfig>, left: Partial<CountertopConfig>) => {
    const project = testProject(
      withCountertop(testWall('MAIN', 3000, base('m1', 0, 600), base('m2', 600, 600)), main),
      withCountertop(testWall('LEFT', 2400, base('l1', 1172, 600)), left)
    );
    const layout = resolveCornerCountertopLayout(
      project.topology, project.walls, project.positionsByWallId, CORNER_TEST_SETTINGS);
    return detectCountertopJointIssues(layout.joints, project.topology, project.walls);
  };

  it('ten sam materiał i głębokość — bez ostrzeżeń (także przy 45°)', () => {
    expect(issuesOf({}, { cornerJoint: { type: 'MITER_45' } })).toEqual([]);
  });

  it('różny materiał, grubość albo kolor blatów łączonych w narożniku', () => {
    const [issue] = issuesOf({}, { materialType: 'STONE' });

    expect(issue).toEqual({
      code: 'warning.countertop.joint.material.mismatch',
      severity: 'WARNING',
      args: { wallType1: 'MAIN', wallType2: 'LEFT' }
    });
    expect(issuesOf({ thicknessMm: 28 }, {}).length).toBe(1);
    expect(issuesOf({}, { colorCode: 'OAK' }).length).toBe(1);
  });

  it('cięcie 45° przy różnych głębokościach — ostrzeżenie z głębokościami', () => {
    const [issue] = issuesOf({ manualDepthMm: 650 }, { cornerJoint: { type: 'MITER_45' } });
    const message = formatCornerIssueMessage(issue, {
      cabinetLabel: id => id,
      wallLabel: type => (type === 'MAIN' ? 'Ściana główna' : 'Ściana lewa')
    });

    expect(issue.code).toBe('warning.countertop.joint.depth.mismatch');
    expect(message).toBe('Cięcie 45° łączy blaty o różnej głębokości: Ściana główna 650 mm i Ściana lewa 600 mm — '
      + 'przekątna nie trafi w narożnik frontów.');
  });

  it('łyżwa przy różnych głębokościach nie ostrzega', () => {
    expect(issuesOf({ manualDepthMm: 650 }, {})).toEqual([]);
  });
});
