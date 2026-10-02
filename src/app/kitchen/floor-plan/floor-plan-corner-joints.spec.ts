import { WallWithCabinets } from '../model/kitchen-state.model';
import { WallCorner } from '../service/corner-layout/corner-layout.model';
import {
  cornerJointGeometryPx,
  cornerJointLabel,
  cornerJointLine,
  cutCountertopsAtMiter
} from './floor-plan-corner-joints';
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

  it('linia złącza: przekątna przy 45°, front blatu przechodzącego przy łyżwie', () => {
    const geometry = cornerJointGeometryPx(corner('L_CORNER_LEFT'), positions, 600, 600)!;

    expect(cornerJointLine(geometry, 'MITER_45', 'main')).toEqual({ x1: 100, y1: 200, x2: 160, y2: 140 });
    expect(cornerJointLine(geometry, 'LYZWA', 'main')).toEqual({ x1: 100, y1: 140, x2: 160, y2: 140 });
    expect(cornerJointLine(geometry, 'ALUMINUM_STRIP', 'left')).toEqual({ x1: 160, y1: 140, x2: 160, y2: 200 });
    expect(cornerJointLabel('MITER_45')).toBe('45°');
    expect(cornerJointLabel('LYZWA')).toBe('łyżwa');
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
});
