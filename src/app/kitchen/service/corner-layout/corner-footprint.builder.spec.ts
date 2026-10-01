import { buildCornerFootprints, cornerRectsOverlap } from './corner-footprint.builder';
import { resolveCornerOwnership, hasCornerCabinetsOnBothWalls } from './corner-ownership.resolver';
import {
  base,
  blindCorner,
  CORNER_TEST_SETTINGS,
  CornerTestProject,
  lCorner,
  placed,
  tall,
  testProject,
  testWall,
  upper
} from './corner-layout.test-fixtures';
import { KitchenCabinetType } from '../../cabinet-form/model/kitchen-cabinet-type';
import { CornerLevel } from './corner-layout.model';

describe('corner-footprint.builder', () => {
  const footprints = (project: CornerTestProject, level: CornerLevel = 'BASE') =>
    buildCornerFootprints(project.topology.corners[0], project.walls, project.positionsByWallId, level, CORNER_TEST_SETTINGS);

  it('szafka ściany A przy START: u = pozycja na ścianie, v = zasięg', () => {
    const [footprint] = footprints(testProject(
      testWall('MAIN', 3000, base('m1', 100, 600)),
      testWall('LEFT', 2400)
    ));

    expect(footprint.nearEdgeMm).toBe(100);
    expect(footprint.farEdgeMm).toBe(700);
    expect(footprint.reachMm).toBe(578);
    expect(footprint.rects).toEqual([{ uMin: 100, uMax: 700, vMin: 0, vMax: 578 }]);
  });

  it('szafka ściany B przy END: v liczone od prawego końca ściany, u = zasięg', () => {
    const [footprint] = footprints(testProject(
      testWall('MAIN', 3000),
      testWall('LEFT', 2400, base('l1', 1500, 600))
    ));

    expect(footprint.nearEdgeMm).toBe(300);
    expect(footprint.farEdgeMm).toBe(900);
    expect(footprint.rects).toEqual([{ uMin: 0, uMax: 578, vMin: 300, vMax: 900 }]);
  });

  it('obudowa boczna poszerza odcinek szafki wzdłuż ściany', () => {
    const cabinet = placed('m1', KitchenCabinetType.BASE_ONE_DOOR, 18, 600, 720, 560, {
      leftEnclosureType: 'SIDE_PLATE_TO_FLOOR',
      rightEnclosureType: 'PARALLEL_FILLER_STRIP'
    });

    const [footprint] = footprints(testProject(testWall('MAIN', 3000, cabinet), testWall('LEFT', 2400)));

    expect(footprint.nearEdgeMm).toBe(0);
    expect(footprint.farEdgeMm).toBe(668);
  });

  it('szafka L w narożniku ma drugie ramię wzdłuż sąsiedniej ściany', () => {
    const [footprint] = footprints(testProject(
      testWall('MAIN', 3000, lCorner('corner', 0, 900, 900)),
      testWall('LEFT', 2400)
    ));

    expect(footprint.rects).toEqual([
      { uMin: 0, uMax: 900, vMin: 0, vMax: 528 },
      { uMin: 0, uMax: 528, vMin: 0, vMax: 900 }
    ]);
  });

  it('szafka L z dala od narożnika nie ma ramienia w tym narożniku', () => {
    const [footprint] = footprints(testProject(
      testWall('MAIN', 3000, lCorner('corner', 2100, 900, 900)),
      testWall('LEFT', 2400)
    ));

    expect(footprint.rects.length).toBe(1);
  });

  it('poziom BASE pomija szafki wiszące, UPPER — dolne; słupek należy do obu', () => {
    const project = testProject(
      testWall('MAIN', 3000, base('b', 0, 600), upper('u', 0, 600), tall('t', 600, 600)),
      testWall('LEFT', 2400)
    );

    expect(footprints(project, 'BASE').map(footprint => footprint.cabinet.id)).toEqual(['b', 't']);
    expect(footprints(project, 'UPPER').map(footprint => footprint.cabinet.id)).toEqual(['u', 't']);
  });

  it('styk krawędzi prostokątów nie jest kolizją', () => {
    expect(cornerRectsOverlap({ uMin: 0, uMax: 578, vMin: 0, vMax: 600 }, { uMin: 0, uMax: 600, vMin: 600, vMax: 1200 }))
      .toBeFalse();
    expect(cornerRectsOverlap({ uMin: 0, uMax: 578, vMin: 0, vMax: 600 }, { uMin: 577, uMax: 600, vMin: 599, vMax: 1200 }))
      .toBeTrue();
  });

  describe('resolveCornerOwnership', () => {
    const ownership = (project: CornerTestProject) => resolveCornerOwnership(project.topology.corners[0], footprints(project));

    it('bez szafki narożnej właścicielem jest ściana A', () => {
      const result = ownership(testProject(
        testWall('MAIN', 3000, base('m1', 0, 600)),
        testWall('LEFT', 2400, base('l1', 1800, 600))
      ));

      expect(result.ownerWallId).toBe('main');
      expect(result.ownerCornerCabinet).toBeNull();
      expect(hasCornerCabinetsOnBothWalls(result)).toBeFalse();
    });

    it('szafka narożna w narożniku ściany B czyni ją właścicielem', () => {
      const result = ownership(testProject(
        testWall('MAIN', 3000, base('m1', 600, 600)),
        testWall('LEFT', 2400, blindCorner('blind', 1400, 1000, 450))
      ));

      expect(result.ownerWallId).toBe('left');
      expect(result.ownerCornerCabinet?.cabinet.id).toBe('blind');
    });

    it('szafka narożna daleko od narożnika nie wpływa na właściciela', () => {
      const result = ownership(testProject(
        testWall('MAIN', 3000),
        testWall('LEFT', 2400, blindCorner('blind', 0, 1000, 450))
      ));

      expect(result.ownerWallId).toBe('main');
      expect(result.ownerCornerCabinet).toBeNull();
    });

    it('szafki narożne po obu stronach → właściciel A i konflikt', () => {
      const result = ownership(testProject(
        testWall('MAIN', 3000, lCorner('l-corner', 0, 900, 900)),
        testWall('LEFT', 2400, blindCorner('blind', 1400, 1000, 450))
      ));

      expect(result.ownerWallId).toBe('main');
      expect(result.ownerCornerCabinet?.cabinet.id).toBe('l-corner');
      expect(hasCornerCabinetsOnBothWalls(result)).toBeTrue();
    });
  });
});
