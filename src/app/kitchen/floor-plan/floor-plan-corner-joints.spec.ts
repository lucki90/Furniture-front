import { WallWithCabinets } from '../model/kitchen-state.model';
import { WallCorner } from '../service/corner-layout/corner-layout.model';
import {
  cornerJointGeometryPx,
  cornerJointLabel,
  cornerJointPoints,
  cutCountertopsAtMiter,
  cutWallCountertopsAtMiterCorners,
  miterCornerGeometriesPx,
  toSvgPoints
} from './floor-plan-corner-joints';
import { CountertopCornerJoint } from '../service/corner-layout/corner-run-trims';
import { CountertopOnFloorPlan, WallPosition } from './floor-plan-layout.builder';

/**
 * Rzut 1 px = 10 mm: ściana MAIN od x = 100 (lico na y = 200), ściana LEFT kończy się na x = 100, PRAWA zaczyna się
 * na x = 400. Blat 600 mm = 60 px.
 */
describe('floor-plan-corner-joints', () => {
  const position = (id: string, x: number, width: number, isHorizontal: boolean): WallPosition => ({
    wall: { id } as WallWithCabinets,
    x,
    y: isHorizontal ? 200 : 0,
    width,
    height: isHorizontal ? 10 : 200,
    rotation: 0,
    labelX: 0,
    labelY: 0,
    isHorizontal,
    scale: 0.1
  });
  const positions = [position('main', 100, 300, true), position('left', 90, 10, false), position('right', 400, 10, false)];

  const corner = (connectionType: 'L_CORNER_LEFT' | 'L_CORNER_RIGHT'): WallCorner => connectionType === 'L_CORNER_LEFT'
    ? { id: 'main:left', connectionType, a: { wallId: 'main', wallType: 'MAIN', end: 'START' }, b: { wallId: 'left', wallType: 'LEFT', end: 'END' } }
    : { id: 'main:right', connectionType, a: { wallId: 'main', wallType: 'MAIN', end: 'END' }, b: { wallId: 'right', wallType: 'RIGHT', end: 'START' } };

  const countertop = (x: number, y: number, width: number, depth: number): CountertopOnFloorPlan => ({
    x, y, width, depth, lengthMm: 0, depthMm: 600, lengthLabelX: 0, lengthLabelY: 0, depthLabelX: 0, depthLabelY: 0,
    isHorizontal: width > depth
  });

  it('wyznacza styk ścian i styk frontów blatów w narożniku lewym i prawym', () => {
    expect(cornerJointGeometryPx(corner('L_CORNER_LEFT'), positions, 600, 600)).toEqual(jasmine.objectContaining({
      wallCorner: { x: 100, y: 200 },
      innerCorner: { x: 160, y: 140 },
      side: 1
    }));
    expect(cornerJointGeometryPx(corner('L_CORNER_RIGHT'), positions, 600, 650)).toEqual(jasmine.objectContaining({
      wallCorner: { x: 400, y: 200 },
      innerCorner: { x: 335, y: 140 },
      side: -1
    }));
  });

  it('ściany, które nie stykają się na rysunku, nie mają geometrii narożnika', () => {
    const detached = [position('main', 100, 300, true), position('left', 50, 10, false)];

    expect(cornerJointGeometryPx(corner('L_CORNER_LEFT'), detached, 600, 600)).toBeNull();
  });

  it('szew: przekątna przy 45°, front blatu przechodzącego przy listwie', () => {
    const geometry = cornerJointGeometryPx(corner('L_CORNER_LEFT'), positions, 600, 600)!;

    expect(cornerJointPoints(geometry, 'MITER_45', 'main', 30)).toEqual([{ x: 100, y: 200 }, { x: 160, y: 140 }]);
    expect(cornerJointPoints(geometry, 'ALUMINUM_STRIP', 'left', 30)).toEqual([{ x: 160, y: 200 }, { x: 160, y: 140 }]);
    expect(cornerJointLabel('MITER_45')).toBe('45°');
    expect(cornerJointLabel('LYZWA')).toBe('łyżwa');
  });

  it('szew łyżwy: linia wcięcia za frontem blatu żeńskiego i skos 45° do styku frontów', () => {
    const left = cornerJointGeometryPx(corner('L_CORNER_LEFT'), positions, 600, 600)!;
    const right = cornerJointGeometryPx(corner('L_CORNER_RIGHT'), positions, 600, 600)!;

    // Wcięcie 30 mm = 3 px: blat ściany lewej (męski) wchodzi 3 px za front blatu ściany głównej (y = 140).
    expect(toSvgPoints(cornerJointPoints(left, 'LYZWA', 'main', 30))).toBe('100,143 157,143 160,140');
    // Przechodzi blat ściany lewej: blat ściany głównej wchodzi 3 px za front blatu lewego (x = 160).
    expect(toSvgPoints(cornerJointPoints(left, 'LYZWA', 'left', 30))).toBe('157,200 157,143 160,140');
    expect(toSvgPoints(cornerJointPoints(right, 'LYZWA', 'main', 30))).toBe('400,143 343,143 340,140');
  });

  it('przy 45° blaty obu ścian są przycinane po przekątnej, a blat poza narożnikiem zostaje prostokątem', () => {
    const geometry = cornerJointGeometryPx(corner('L_CORNER_LEFT'), positions, 600, 600)!;
    const mainCountertop = countertop(100, 140, 120, 60);
    const leftCountertop = countertop(100, 20, 60, 180);
    const farCountertop = countertop(300, 140, 50, 60);

    const [main, far] = cutCountertopsAtMiter([mainCountertop, farCountertop], geometry, 'A');
    const [left] = cutCountertopsAtMiter([leftCountertop], geometry, 'B');

    expect(main.polygonPoints).toBe('100,200 160,140 220,140 220,200');
    expect(left.polygonPoints).toBe('100,20 160,20 160,140 100,200');
    expect(far.polygonPoints).toBeUndefined();
  });

  it('geometria cięć 45° tylko dla narożników z takim złączem, a blaty ściany przycina ten narożnik, w którym leży', () => {
    const joints: CountertopCornerJoint[] = [
      { cornerId: 'main:left', type: 'MITER_45', ruleOwnerWallId: 'main', passingWallId: 'main' },
      { cornerId: 'main:right', type: 'LYZWA', ruleOwnerWallId: 'main', passingWallId: 'main' }
    ];
    const miters = miterCornerGeometriesPx(
      joints, [corner('L_CORNER_LEFT'), corner('L_CORNER_RIGHT')], positions, 600);

    expect(miters.length).toBe(1);
    expect(miters[0].wallBId).toBe('left');

    const [left] = cutWallCountertopsAtMiterCorners('left', [countertop(100, 20, 60, 180)], miters);
    const [right] = cutWallCountertopsAtMiterCorners('right', [countertop(340, 20, 60, 180)], miters);
    expect(left.polygonPoints).toBe('100,20 160,20 160,140 100,200');
    expect(right.polygonPoints).toBeUndefined();
  });
});
