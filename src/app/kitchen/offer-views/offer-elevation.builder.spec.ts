import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { CabinetPosition, KitchenCabinet, WallWithCabinets } from '../model/kitchen-state.model';
import { CornerGhost } from '../service/corner-layout/corner-layout.model';
import { buildOfferElevation, OfferElevationInput } from './offer-elevation.builder';
import { offerCabinet } from './offer-views.test-fixtures';

function wall(type: WallWithCabinets['type'], widthMm: number, heightMm: number, cabinets: KitchenCabinet[]): WallWithCabinets {
  return { id: 'wall-1', type, widthMm, heightMm, cabinets };
}

function position(cabinet: KitchenCabinet, x: number, y = 0): CabinetPosition {
  return { cabinetId: cabinet.id, x, y, width: cabinet.width, height: cabinet.height };
}

function input(overrides: Partial<OfferElevationInput> = {}): OfferElevationInput {
  const base = offerCabinet('base', KitchenCabinetType.BASE_WITH_DRAWERS, 600, 720, 560, { drawerQuantity: 3 });
  const door = offerCabinet('door', KitchenCabinetType.BASE_ONE_DOOR, 400, 720, 560);
  const upper = offerCabinet('upper', KitchenCabinetType.UPPER_ONE_DOOR, 600, 720, 320);
  const cabinets = [base, door, upper];
  return {
    wall: wall('MAIN', 3000, 2600, cabinets),
    cabinets,
    positions: [position(base, 0), position(door, 600), position(upper, 0, 1780)],
    feetHeightMm: 100,
    upperFillerHeightMm: 100,
    fillerWidthMm: 50,
    countertopThicknessMm: 38,
    countertopRuns: [{ startMm: 0, endMm: 1005, lengthMm: 1005 }],
    plinthEnabled: true,
    ...overrides
  };
}

function parse(svg: string): Document {
  return new DOMParser().parseFromString(svg, 'image/svg+xml');
}

function texts(doc: Document): string[] {
  return Array.from(doc.querySelectorAll('text')).map(element => element.textContent ?? '');
}

describe('buildOfferElevation — widok ściany od frontu do oferty', () => {
  it('rysuje ścianę, korpusy z frontami i uchwytami, blat, cokół i blendę górną', () => {
    const doc = parse(buildOfferElevation(input()).svg);

    expect(doc.querySelector('parsererror')).toBeNull();
    const rects = Array.from(doc.querySelectorAll('rect'));
    // tło, ściana, blat, cokół, blenda górna, 3 korpusy, fronty: 3 szuflady + 1 drzwi + 1 drzwi górne
    expect(rects.length).toBe(13);
    expect(doc.querySelectorAll('line[stroke-width="1.6"]').length).toBe(5);
  });

  it('wymiary: szerokości szafek dolnych i górnych, długość i wysokość ściany', () => {
    const labels = texts(parse(buildOfferElevation(input()).svg));

    expect(labels).toEqual(jasmine.arrayContaining(['600', '400', '3000', '2600']));
    expect(labels.filter(label => label === '600').length).toBe(2);
  });

  it('skala jest proporcjonalna i rysunek mieści się w ramce widoku PDF przy opisach 7,5 pt', () => {
    for (const [widthMm, heightMm] of [[3600, 2600], [2400, 2600], [6000, 2700], [1200, 2600]]) {
      const drawing = buildOfferElevation(input({ wall: wall('MAIN', widthMm, heightMm, []), cabinets: [], positions: [] }));
      const fit = Math.min(495 / drawing.width, 300 / drawing.height);

      expect(12 * fit).toBeCloseTo(7.5, 1);
    }
  });

  it('bez cokołu i bez blatu nie rysuje ich, a wyspa nie ma tła ściany ani wymiaru wysokości', () => {
    const doc = parse(buildOfferElevation(input({
      wall: wall('ISLAND', 2400, 900, []),
      plinthEnabled: false,
      countertopRuns: []
    })).svg);

    // tło, 3 korpusy, 5 frontów, blenda górna — bez ściany, blatu i cokołu
    expect(doc.querySelectorAll('rect').length).toBe(10);
    expect(texts(doc)).not.toContain('900');
  });

  it('szafka sąsiedniej ściany przy narożniku jest rysowana linią przerywaną', () => {
    const neighbour = offerCabinet('neighbour', KitchenCabinetType.BASE_ONE_DOOR, 600, 720, 560);
    const ghost = {
      wallId: 'wall-1',
      wallEnd: 'END',
      sourceWallId: 'wall-2',
      sourceWallType: 'LEFT',
      cabinet: neighbour,
      sourcePosition: position(neighbour, 0),
      kind: 'SIDE_PROFILE',
      startMm: 2440,
      endMm: 3000,
      frontStartMm: null,
      frontEndMm: null,
      conflict: false
    } as unknown as CornerGhost;

    const svg = buildOfferElevation(input({ cornerGhosts: [ghost] })).svg;

    expect(svg.match(/stroke-dasharray="4 3"/g)?.length).toBe(2);
  });
});
