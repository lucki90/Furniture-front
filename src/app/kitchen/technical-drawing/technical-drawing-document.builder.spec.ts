import { KitchenCabinet, WallWithCabinets } from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { buildTechnicalDrawingDocument } from './technical-drawing-document.builder';
import { boardFixture, cabinetResponseFixture } from './testing/board.fixture';

describe('buildTechnicalDrawingDocument', () => {
  it('builds a serializable document package for drawable cabinets', () => {
    const document = buildTechnicalDrawingDocument([
      wall('wall-main', [
        cabinet('cab-1', 'Szafka bazowa', cabinetResponseFixture([
          boardFixture('SIDE_NAME', 758, 536, 18, 2),
          boardFixture('TOP_WREATH_NAME', 100, 564, 18, 2),
          boardFixture('WREATH_NAME', 536, 564, 18),
          boardFixture('HDF_NAME', 756, 596, 3),
          boardFixture('FRONT_NAME', 752, 594, 18)
        ]))
      ])
    ]);

    expect(document.schemaVersion).toBe(1);
    expect(document.totals).toEqual(jasmine.objectContaining({
      wallCount: 1,
      cabinetCount: 1,
      drawingCount: 1,
      skippedCabinetCount: 0,
      highConfidenceCount: 1
    }));
    expect(document.drawings[0]).toEqual(jasmine.objectContaining({
      wall: jasmine.objectContaining({ id: 'wall-main', label: 'Ściana główna', order: 1 }),
      cabinet: jasmine.objectContaining({ id: 'cab-1', label: 'Szafka bazowa', order: 1 }),
      drawing: jasmine.objectContaining({
        cabinetWidthMm: 600,
        cabinetHeightMm: 758,
        cabinetDepthMm: 536,
        boardCount: 7,
        sourceConfidence: 'high',
        footprint: {
          shape: 'RECTANGLE',
          widthMm: 600,
          depthMm: 536,
          cutoutWidthMm: null,
          cutoutDepthMm: null
        }
      })
    }));
  });

  it('keeps document boards detached from full pricing-heavy Board objects', () => {
    const document = buildTechnicalDrawingDocument([
      wall('wall-main', [
        cabinet('cab-1', null, cabinetResponseFixture([
          boardFixture('SHELF_L_SHAPE', 560, 760, 18, 2, {
            lShapeCutoutLengthAMm: 220,
            lShapeCutoutLengthBMm: 180
          })
        ]))
      ])
    ]);

    expect(document.drawings[0].drawing.boards[0]).toEqual(jasmine.objectContaining({
      boardName: 'SHELF_L_SHAPE',
      role: 'SHELF',
      quantity: 2,
      widthMm: 760,
      heightMm: 560,
      lShapeCutoutLengthAMm: 220,
      lShapeCutoutLengthBMm: 180
    }));
    expect(document.drawings[0].drawing.footprint).toEqual({
      shape: 'L_SHAPE',
      widthMm: 560,
      depthMm: 760,
      cutoutWidthMm: 220,
      cutoutDepthMm: 180
    });
    expect(document.drawings[0].drawing.boards[0] as any).not.toEqual(jasmine.objectContaining({
      source: jasmine.anything(),
      priceEntry: jasmine.anything()
    }));
  });

  it('tracks skipped cabinets with explicit reasons', () => {
    const document = buildTechnicalDrawingDocument([
      wall('wall-main', [
        cabinet('cab-no-response'),
        cabinet('cab-empty', 'Pusta kalkulacja', cabinetResponseFixture([])),
        cabinet('cab-invalid', null, cabinetResponseFixture([
          boardFixture('SIDE_NAME', 0, 560, 18)
        ]))
      ])
    ]);

    expect(document.drawings).toEqual([]);
    expect(document.skippedCabinets.map(item => [item.cabinetId, item.reason])).toEqual([
      ['cab-no-response', 'NO_CALCULATION_RESPONSE'],
      ['cab-empty', 'NO_BOARDS'],
      ['cab-invalid', 'NO_DRAWABLE_BOARDS']
    ]);
    expect(document.skippedCabinets[0].cabinetLabel).toBe('Szafka 1');
    expect(document.skippedCabinets[1].cabinetLabel).toBe('Pusta kalkulacja');
  });

  it('preserves wall and cabinet order across multiple walls', () => {
    const document = buildTechnicalDrawingDocument([
      wall('wall-main', [cabinet('cab-main', null, simpleResponse())]),
      wall('wall-island', [cabinet('cab-island', null, simpleResponse(), { cabinetSide: 'BACK' })], {
        type: 'ISLAND',
        islandDepthMm: 900
      })
    ]);

    expect(document.drawings.map(item => ({
      wallId: item.wall.id,
      wallOrder: item.wall.order,
      wallLabel: item.wall.label,
      cabinetOrder: item.cabinet.order,
      cabinetSide: item.cabinet.side,
      islandDepthMm: item.wall.islandDepthMm
    }))).toEqual([
      {
        wallId: 'wall-main',
        wallOrder: 1,
        wallLabel: 'Ściana główna',
        cabinetOrder: 1,
        cabinetSide: null,
        islandDepthMm: null
      },
      {
        wallId: 'wall-island',
        wallOrder: 2,
        wallLabel: 'Wyspa kuchenna',
        cabinetOrder: 1,
        cabinetSide: 'BACK',
        islandDepthMm: 900
      }
    ]);
  });
});

function simpleResponse() {
  return cabinetResponseFixture([
    boardFixture('SIDE_NAME', 720, 560, 18, 2),
    boardFixture('WREATH_NAME', 536, 564, 18)
  ]);
}

function wall(
  id: string,
  cabinets: KitchenCabinet[],
  overrides: Partial<WallWithCabinets> = {}
): WallWithCabinets {
  return {
    id,
    type: 'MAIN',
    widthMm: 3600,
    heightMm: 2600,
    cabinets,
    ...overrides
  };
}

function cabinet(
  id: string,
  name?: string | null,
  calculationResponse?: KitchenCabinet['calculationResponse'],
  overrides: Partial<KitchenCabinet> = {}
): KitchenCabinet {
  return {
    id,
    name: name ?? undefined,
    type: KitchenCabinetType.BASE_ONE_DOOR,
    openingType: 'HANDLE',
    width: 600,
    height: 720,
    depth: 560,
    positionY: 0,
    shelfQuantity: 1,
    calculationResponse,
    ...overrides
  } as KitchenCabinet;
}
