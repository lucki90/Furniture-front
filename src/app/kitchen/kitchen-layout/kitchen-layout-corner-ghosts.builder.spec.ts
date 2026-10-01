import { CornerGhost, CornerReservedZone } from '../service/corner-layout/corner-layout.model';
import { base, lCorner, upper } from '../service/corner-layout/corner-layout.test-fixtures';
import { buildCornerGhostLayer, CornerGhostLayerInput } from './kitchen-layout-corner-ghosts.builder';

describe('buildCornerGhostLayer', () => {
  const SCALE = 0.5;
  const SCALE_VERT = 0.1;

  const ghost = (overrides: Partial<CornerGhost>): CornerGhost => {
    const cabinet = overrides.cabinet ?? base('m1', 0, 600).cabinet;
    return {
      wallId: 'left',
      wallEnd: 'END',
      sourceWallId: 'main',
      sourceWallType: 'MAIN',
      cabinet,
      sourcePosition: { cabinetId: cabinet.id, x: 0, y: 0, width: cabinet.width, height: cabinet.height },
      kind: 'SIDE_PROFILE',
      startMm: 1822,
      endMm: 2400,
      frontStartMm: null,
      frontEndMm: null,
      conflict: false,
      ...overrides
    };
  };

  const input = (overrides: Partial<CornerGhostLayerInput>): CornerGhostLayerInput => ({
    ghosts: [],
    reservedZones: [],
    scale: SCALE,
    scaleVert: SCALE_VERT,
    wallDisplayHeight: 260,
    topZone: { y: 0, height: 72 },
    counterZone: { y: 160, height: 4 },
    bottomZone: { y: 164, height: 96 },
    showUpperCabinets: true,
    showCountertop: true,
    feetHeightMmFor: () => 100,
    countertopDepthMmFor: () => 600,
    cabinetLabel: item => item.cabinet.id,
    wallLabel: type => (type === 'MAIN' ? 'Ściana główna' : String(type)),
    ...overrides
  });

  it('bok szafki dolnej: odcinek w px, korpus nad nóżkami i krawędź blatu od narożnika', () => {
    const layer = buildCornerGhostLayer(input({ ghosts: [ghost({})] }));

    const [view] = layer.ghosts;
    expect(view.body).toEqual({ x: 911, y: 178, width: 289, height: 72 });
    expect(view.front).toBeNull();
    expect(view.countertop).toEqual({ x: 900, y: 160, width: 300, height: 4 });
    expect(view.title).toBe('Ściana główna: m1');
  });

  it('cień przy START: blat zaczyna się w narożniku', () => {
    const layer = buildCornerGhostLayer(input({ ghosts: [ghost({ wallEnd: 'START', startMm: 0, endMm: 578 })] }));

    expect(layer.ghosts[0].countertop?.x).toBe(0);
  });

  it('ramię szafki L: front ramienia i blat nad całym ramieniem', () => {
    const arm = ghost({
      cabinet: lCorner('mc', 0, 900, 900).cabinet,
      kind: 'L_ARM',
      startMm: 1500,
      endMm: 2400,
      frontStartMm: 1500,
      frontEndMm: 1872
    });

    const [view] = buildCornerGhostLayer(input({ ghosts: [arm] })).ghosts;

    expect(view.front).toEqual({ x: 750, y: view.body.y, width: 186, height: view.body.height });
    expect(view.countertop).toEqual({ x: 750, y: 160, width: 450, height: 4 });
  });

  it('kolizja w narożniku jest opisana w tytule cienia', () => {
    const [view] = buildCornerGhostLayer(input({ ghosts: [ghost({ conflict: true })] })).ghosts;

    expect(view.conflict).toBeTrue();
    expect(view.title).toContain('koliduje w narożniku');
  });

  it('ukryte szafki górne chowają cienie i strefy górne; ukryty blat — krawędź blatu', () => {
    const zones: CornerReservedZone[] = [
      { wallId: 'left', wallEnd: 'END', level: 'BASE', startMm: 1772, endMm: 2400 },
      { wallId: 'left', wallEnd: 'END', level: 'UPPER', startMm: 2062, endMm: 2400 }
    ];
    const upperGhost = ghost({ cabinet: upper('u1', 0, 600).cabinet, startMm: 2062 });

    const layer = buildCornerGhostLayer(input({
      ghosts: [ghost({}), upperGhost],
      reservedZones: zones,
      showUpperCabinets: false,
      showCountertop: false
    }));

    expect(layer.ghosts.map(view => view.cabinetId)).toEqual(['m1']);
    expect(layer.ghosts[0].countertop).toBeNull();
    expect(layer.reservedZones.map(view => view.key)).toEqual(['END|BASE']);
  });

  it('strefa narożna zajmuje pas dolny albo górny elewacji', () => {
    const zones: CornerReservedZone[] = [
      { wallId: 'left', wallEnd: 'START', level: 'BASE', startMm: 0, endMm: 628 },
      { wallId: 'left', wallEnd: 'END', level: 'UPPER', startMm: 2062, endMm: 2400 }
    ];

    const views = buildCornerGhostLayer(input({ reservedZones: zones })).reservedZones;

    expect(views.map(view => view.rect)).toEqual([
      { x: 0, y: 164, width: 314, height: 96 },
      { x: 1031, y: 0, width: 169, height: 72 }
    ]);
    expect(views[0].title).toContain('628 mm');
  });
});
