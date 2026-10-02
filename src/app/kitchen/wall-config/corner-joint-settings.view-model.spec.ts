import { CornerJointSettings } from '../model/countertop.model';
import { WallType } from '../model/kitchen-project.model';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { CountertopCornerJoint } from '../service/corner-layout/corner-run-trims';
import { resolveWallTopology } from '../service/corner-layout/wall-topology.resolver';
import {
  buildCornerJointSettingsViews,
  toCornerPassThrough,
  withCornerJointSettings
} from './corner-joint-settings.view-model';

describe('corner-joint-settings.view-model', () => {
  const labels: Record<string, string> = { MAIN: 'Ściana główna', LEFT: 'Ściana lewa', RIGHT: 'Ściana prawa' };
  const wallLabel = (type: WallType) => labels[type] ?? type;

  const wall = (type: WallType, cornerJoint?: CornerJointSettings): WallWithCabinets => ({
    id: type.toLowerCase(),
    type,
    widthMm: 3000,
    heightMm: 2600,
    cabinets: [],
    countertopConfig: { enabled: true, thicknessMm: 38, cornerJoint }
  });

  const joint = (cornerId: string, ruleOwnerWallId: string): CountertopCornerJoint =>
    ({ cornerId, type: 'LYZWA', ruleOwnerWallId, passingWallId: ruleOwnerWallId });

  const viewsFor = (selectedWallId: string, walls: WallWithCabinets[], joints: CountertopCornerJoint[] = []) =>
    buildCornerJointSettingsViews(selectedWallId, resolveWallTopology(walls), walls, joints, wallLabel);

  it('pokazuje narożnik na obu ścianach, z zapisem zawsze do ściany bocznej', () => {
    const walls = [wall('MAIN'), wall('LEFT')];

    const [onMain] = viewsFor('main', walls);
    const [onLeft] = viewsFor('left', walls);

    expect(onMain.title).toBe('Narożnik z «Ściana lewa»');
    expect(onLeft.title).toBe('Narożnik z «Ściana główna»');
    expect(onMain.sideWallId).toBe('left');
    expect(onLeft.sideWallId).toBe('left');
  });

  it('ściana MAIN w układzie U ma dwa narożniki', () => {
    const views = viewsFor('main', [wall('MAIN'), wall('LEFT'), wall('RIGHT')]);

    expect(views.map(view => view.cornerId)).toEqual(['main:left', 'main:right']);
  });

  it('domyślnie łyżwa i blat przechodzący automatycznie z podpowiedzią reguły', () => {
    const walls = [wall('MAIN'), wall('LEFT')];

    const [view] = viewsFor('left', walls, [joint('main:left', 'main')]);

    expect(view.type).toBe('LYZWA');
    expect(view.passThroughChoice).toBe('AUTO');
    expect(view.joined).toBeTrue();
    expect(view.passThroughOptions).toEqual([
      { value: 'AUTO', label: 'Automatycznie («Ściana główna»)' },
      { value: 'left', label: 'Ta ściana' },
      { value: 'main', label: '«Ściana główna»' }
    ]);
  });

  it('narożnik bez połączenia blatów: „Automatycznie” bez podpowiedzi i joined = false', () => {
    const [view] = viewsFor('main', [wall('MAIN'), wall('LEFT')]);

    expect(view.joined).toBeFalse();
    expect(view.passThroughOptions[0].label).toBe('Automatycznie');
  });

  it('odczytuje zapisany typ złącza i blat przechodzący ze ściany bocznej', () => {
    const walls = [wall('MAIN'), wall('LEFT', { type: 'MITER_45', passThrough: 'NEIGHBOR' })];

    const [view] = viewsFor('left', walls);

    expect(view.type).toBe('MITER_45');
    expect(view.passThroughChoice).toBe('main');
  });

  it('zapisuje wybór z perspektywy ściany bocznej', () => {
    const view = { sideWallId: 'left' };

    expect(toCornerPassThrough('AUTO', view)).toBe('AUTO');
    expect(toCornerPassThrough('left', view)).toBe('THIS_WALL');
    expect(toCornerPassThrough('main', view)).toBe('NEIGHBOR');
  });

  it('nowe ustawienie zachowuje pozostałą konfigurację blatu i drugie pole połączenia', () => {
    const sideWall = wall('LEFT', { type: 'ALUMINUM_STRIP', passThrough: 'THIS_WALL' });

    const config = withCornerJointSettings(sideWall, { type: 'MITER_45' });

    expect(config.thicknessMm).toBe(38);
    expect(config.cornerJoint).toEqual({ type: 'MITER_45', passThrough: 'THIS_WALL' });
    expect(withCornerJointSettings(undefined, { type: 'LYZWA' })).toEqual({ enabled: true, cornerJoint: { type: 'LYZWA' } });
  });
});
