import { MultiWallCalculateResponse } from '../model/kitchen-project.model';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { buildBoardExcelRows } from './kitchen-project-summary.utils';
import { ProjectDetailsAggregatorService } from './project-details-aggregator.service';

describe('Project details hinge milling aggregation', () => {
  it('keeps hinge milling remarks on the front from the correct wall in Excel rows', () => {
    const service = new ProjectDetailsAggregatorService();
    const response = {
      walls: [
        {
          cabinets: [createCabinet(
            [{ category: 'MILLING', type: 'HINGE_MILLING', quantity: 2, totalPrice: 10, priceEntry: { price: 5 } }],
            { hingeCountPerPiece: 2, hingeEdgeLengthMm: 720 }
          )]
        },
        {
          cabinets: [createCabinet([], {})]
        }
      ],
      totalWasteCost: 0,
      globalWasteComponents: []
    } as unknown as MultiWallCalculateResponse;

    const aggregation = service.aggregate(response, [] as WallWithCabinets[]);
    const frontRows = buildBoardExcelRows(aggregation.boards, {}, {})
      .filter(row => row.sticker.startsWith('Front'));

    expect(frontRows).toEqual([
      jasmine.objectContaining({
        quantity: 1,
        sticker: 'Front (Sz.1)',
        remarks: 'Puszki zawiasów: 2 na front, wzdłuż krawędzi 720 mm'
      }),
      jasmine.objectContaining({
        quantity: 1,
        sticker: 'Front (Sz.2)',
        remarks: ''
      })
    ]);
  });

  it('uses the per-front hinge count, not the cabinet total, for two identical doors', () => {
    const service = new ProjectDetailsAggregatorService();
    const twoDoors = createCabinet(
      [{ category: 'MILLING', type: 'HINGE_MILLING', quantity: 4, totalPrice: 20, priceEntry: { price: 5 } }],
      { quantity: 2, sideX: 712, sideY: 394, hingeCountPerPiece: 2, hingeEdgeLengthMm: 712 }
    );
    const response = {
      walls: [{ cabinets: [twoDoors] }],
      totalWasteCost: 0,
      globalWasteComponents: []
    } as unknown as MultiWallCalculateResponse;

    const aggregation = service.aggregate(response, [] as WallWithCabinets[]);
    const [frontRow] = buildBoardExcelRows(aggregation.boards, {}, {})
      .filter(row => row.sticker.startsWith('Front'));

    expect(frontRow.quantity).toBe(2);
    expect(frontRow.remarks).toBe('Puszki zawiasów: 2 na front, wzdłuż krawędzi 712 mm');
  });
});

function createCabinet(jobs: unknown[], front: Record<string, number>) {
  return {
    kitchenCabinetType: 'BASE_ONE_DOOR',
    jobs,
    components: [],
    boards: [
      {
        boardName: 'FRONT_NAME',
        boardNameLabel: 'Front',
        boardThickness: 18,
        sideX: 720,
        sideY: 600,
        quantity: 1,
        totalPrice: 100,
        color: 'WHITE',
        veneerX: 0,
        veneerY: 0,
        veneerColor: '',
        priceEntry: { price: 100 },
        ...front
      }
    ]
  };
}
