import { WallType } from '../../model/kitchen-project.model';
import { WallWithCabinets } from '../../model/kitchen-state.model';
import { cornerAt, resolveWallTopology, toWallConnectionRequests } from './wall-topology.resolver';

function wall(id: string, type: WallType): WallWithCabinets {
  return { id, type, widthMm: 3000, heightMm: 2600, cabinets: [] };
}

describe('wall-topology.resolver', () => {
  describe('resolveWallTopology', () => {
    it('łączy LEFT z MAIN: MAIN.START ↔ LEFT.END (widok z wnętrza)', () => {
      const topology = resolveWallTopology([wall('main', 'MAIN'), wall('left', 'LEFT')]);

      expect(topology.corners).toEqual([{
        id: 'main:left',
        connectionType: 'L_CORNER_LEFT',
        a: { wallId: 'main', wallType: 'MAIN', end: 'START' },
        b: { wallId: 'left', wallType: 'LEFT', end: 'END' }
      }]);
    });

    it('łączy RIGHT z MAIN: MAIN.END ↔ RIGHT.START (widok z wnętrza)', () => {
      const topology = resolveWallTopology([wall('main', 'MAIN'), wall('right', 'RIGHT')]);

      expect(topology.corners).toEqual([{
        id: 'main:right',
        connectionType: 'L_CORNER_RIGHT',
        a: { wallId: 'main', wallType: 'MAIN', end: 'END' },
        b: { wallId: 'right', wallType: 'RIGHT', end: 'START' }
      }]);
    });

    it('układ U daje dwa narożniki niezależnie od kolejności ścian', () => {
      const ordered = resolveWallTopology([wall('main', 'MAIN'), wall('left', 'LEFT'), wall('right', 'RIGHT')]);
      const sortedByType = resolveWallTopology([wall('left', 'LEFT'), wall('main', 'MAIN'), wall('right', 'RIGHT')]);

      expect(ordered.corners.map(corner => corner.id)).toEqual(['main:left', 'main:right']);
      expect(sortedByType.corners).toEqual(ordered.corners);
    });

    it('bez MAIN łączy LEFT z CORNER_LEFT, a RIGHT z CORNER_RIGHT', () => {
      const topology = resolveWallTopology([
        wall('left', 'LEFT'),
        wall('corner-left', 'CORNER_LEFT'),
        wall('corner-right', 'CORNER_RIGHT'),
        wall('right', 'RIGHT')
      ]);

      expect(topology.corners.map(corner => [corner.a.wallId, corner.a.end, corner.b.wallId, corner.b.end])).toEqual([
        ['corner-left', 'START', 'left', 'END'],
        ['corner-right', 'END', 'right', 'START']
      ]);
    });

    it('przy obecnej MAIN ignoruje ściany CORNER_* jako partnera', () => {
      const topology = resolveWallTopology([wall('corner-left', 'CORNER_LEFT'), wall('main', 'MAIN'), wall('left', 'LEFT')]);

      expect(topology.corners.map(corner => corner.a.wallId)).toEqual(['main']);
    });

    it('nie łączy RIGHT z CORNER_LEFT', () => {
      expect(resolveWallTopology([wall('corner-left', 'CORNER_LEFT'), wall('right', 'RIGHT')]).corners).toEqual([]);
    });

    it('pomija wyspę i ściany bez partnera', () => {
      expect(resolveWallTopology([wall('island', 'ISLAND'), wall('left', 'LEFT')]).corners).toEqual([]);
      expect(resolveWallTopology([wall('main', 'MAIN'), wall('island', 'ISLAND')]).corners).toEqual([]);
    });
  });

  describe('cornerAt', () => {
    const topology = resolveWallTopology([wall('main', 'MAIN'), wall('left', 'LEFT'), wall('right', 'RIGHT')]);

    it('zwraca narożnik dla połączonego końca ściany', () => {
      expect(cornerAt(topology, 'main', 'START')?.id).toBe('main:left');
      expect(cornerAt(topology, 'main', 'END')?.id).toBe('main:right');
      expect(cornerAt(topology, 'left', 'END')?.id).toBe('main:left');
      expect(cornerAt(topology, 'right', 'START')?.id).toBe('main:right');
    });

    it('zwraca undefined dla wolnego końca ściany', () => {
      expect(cornerAt(topology, 'left', 'START')).toBeUndefined();
      expect(cornerAt(topology, 'right', 'END')).toBeUndefined();
    });
  });

  describe('toWallConnectionRequests', () => {
    it('mapuje narożniki na indeksy w kolejności ścian requestu', () => {
      const walls = [wall('right', 'RIGHT'), wall('left', 'LEFT'), wall('main', 'MAIN')];

      expect(toWallConnectionRequests(resolveWallTopology(walls), walls)).toEqual([
        { wallIndexA: 2, wallIndexB: 1, connectionType: 'L_CORNER_LEFT' },
        { wallIndexA: 2, wallIndexB: 0, connectionType: 'L_CORNER_RIGHT' }
      ]);
    });

    it('pomija narożnik, którego ściany nie ma na liście', () => {
      const topology = resolveWallTopology([wall('main', 'MAIN'), wall('left', 'LEFT')]);

      expect(toWallConnectionRequests(topology, [wall('main', 'MAIN')])).toEqual([]);
    });
  });
});
