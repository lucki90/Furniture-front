import { buildCornerFootprints } from './corner-footprint.builder';
import { CornerLevel } from './corner-layout.model';
import { resolveCornerOwnership } from './corner-ownership.resolver';
import { maxCabinetReachMm } from './corner-reach';
import { resolveCornerReservationMm } from './corner-reservation';
import {
  base,
  blindCorner,
  CORNER_TEST_SETTINGS,
  CornerTestProject,
  lCorner,
  testProject,
  testWall,
  upper,
  upperBlindCorner
} from './corner-layout.test-fixtures';

/**
 * Strefa narożna ściany dostawionej — przypadki wzorcowe z `_docs/plan-narozniki-cross-wall.md`.
 */
describe('resolveCornerReservationMm', () => {
  function reservation(project: CornerTestProject, level: CornerLevel): number {
    const corner = project.topology.corners[0];
    const footprints = buildCornerFootprints(corner, project.walls, project.positionsByWallId, level, CORNER_TEST_SETTINGS);
    const ownership = resolveCornerOwnership(corner, footprints);
    const partner = project.walls.find(wall => wall.id !== ownership.ownerWallId)!;
    return resolveCornerReservationMm({
      ownerFootprints: footprints.filter(footprint => footprint.wallId === ownership.ownerWallId),
      ownerCornerCabinet: ownership.ownerCornerCabinet,
      partnerMaxReachMm: maxCabinetReachMm(partner.cabinets, level, CORNER_TEST_SETTINGS),
      settings: CORNER_TEST_SETTINGS
    });
  }

  it('G1: szafka dolna 560 przy MAIN.START → strefa LEFT.END = 560 + 18 + 50 = 628', () => {
    const project = testProject(
      testWall('MAIN', 3000, base('m1', 0, 600)),
      testWall('LEFT', 2400, base('l1', 0, 600))
    );

    expect(reservation(project, 'BASE')).toBe(628);
  });

  it('G3: narożnik L 900/900 na MAIN → strefa LEFT.END = ramię B = 900', () => {
    const project = testProject(
      testWall('MAIN', 3000, lCorner('l-corner', 0, 900, 900)),
      testWall('LEFT', 2400, base('l1', 0, 600))
    );

    expect(reservation(project, 'BASE')).toBe(900);
  });

  it('G4: ślepy narożnik na MAIN → strefa = jego zasięg 528 (blenda X należy do ślepej części)', () => {
    const project = testProject(
      testWall('MAIN', 3000, blindCorner('blind', 0, 1000, 450)),
      testWall('LEFT', 2400, base('l1', 0, 600))
    );

    expect(reservation(project, 'BASE')).toBe(528);
  });

  it('G5: szafka przy MAIN.END → strefa RIGHT.START = 628', () => {
    const project = testProject(
      testWall('MAIN', 3000, base('m-end', 2400, 600)),
      testWall('RIGHT', 2400, base('r1', 0, 600))
    );

    expect(reservation(project, 'BASE')).toBe(628);
  });

  it('G7: górny ślepy narożnik 320 → strefa górna 338, dolna 0', () => {
    const project = testProject(
      testWall('MAIN', 3000, upperBlindCorner('blind-up', 0, 800, 400)),
      testWall('LEFT', 2400, base('l1', 0, 600), upper('l-up', 0, 600))
    );

    expect(reservation(project, 'UPPER')).toBe(338);
    expect(reservation(project, 'BASE')).toBe(0);
  });

  it('szafka właściciela poza kwadratem narożnym → brak strefy', () => {
    const project = testProject(
      testWall('MAIN', 3000, base('m1', 700, 600)),
      testWall('LEFT', 2400, base('l1', 0, 600))
    );

    expect(reservation(project, 'BASE')).toBe(0);
  });

  it('ściana dostawiona bez szafek danego poziomu → brak strefy', () => {
    const project = testProject(
      testWall('MAIN', 3000, base('m1', 0, 600)),
      testWall('LEFT', 2400)
    );

    expect(reservation(project, 'BASE')).toBe(0);
  });
});
