import { CornerJointSettings } from '../../model/countertop.model';
import { WallWithCabinets } from '../../model/kitchen-state.model';
import { WallType } from '../../model/kitchen-project.model';
import { resolveCornerJointConfig } from './corner-joint-config';
import { resolveWallTopology } from './wall-topology.resolver';

function wall(type: WallType, cornerJoint?: CornerJointSettings): WallWithCabinets {
  return {
    id: type.toLowerCase(),
    type,
    widthMm: 3000,
    heightMm: 2600,
    cabinets: [],
    countertopConfig: { enabled: true, cornerJoint }
  };
}

function resolve(sideWallJoint?: CornerJointSettings) {
  const walls = [wall('MAIN', { type: 'ALUMINUM_STRIP', passThrough: 'THIS_WALL' }), wall('LEFT', sideWallJoint)];
  const [corner] = resolveWallTopology(walls).corners;
  return resolveCornerJointConfig(corner, walls);
}

describe('resolveCornerJointConfig', () => {
  it('bez ustawienia ściany bocznej: łyżwa i blat przechodzący z reguły', () => {
    expect(resolve()).toEqual({ type: 'LYZWA', passThroughWallId: null });
  });

  it('czyta ustawienie wyłącznie ze ściany bocznej (B) narożnika', () => {
    expect(resolve({ type: 'MITER_45' }).type).toBe('MITER_45');
    expect(resolve({}).type).toBe('LYZWA');
  });

  it('wybór blatu przechodzącego: ta ściana → B, sąsiednia → A, AUTO → reguła', () => {
    expect(resolve({ passThrough: 'THIS_WALL' }).passThroughWallId).toBe('left');
    expect(resolve({ passThrough: 'NEIGHBOR' }).passThroughWallId).toBe('main');
    expect(resolve({ passThrough: 'AUTO' }).passThroughWallId).toBeNull();
  });

  it('wartości puste z odczytu projektu traktuje jak brak ustawienia', () => {
    const fromBackend = { type: null, passThrough: null } as unknown as CornerJointSettings;

    expect(resolve(fromBackend)).toEqual({ type: 'LYZWA', passThroughWallId: null });
  });
});
