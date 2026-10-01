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
          cabinets: [createCabinet([
            { category: 'MILLING', type: 'HINGE_MILLING', quantity: 2, totalPrice: 10, priceEntry: { price: 5 } }
          ])]
        },
        {
          cabinets: [createCabinet([])]
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
        remarks: '2 puszki na długość 720mm'
      }),
      jasmine.objectContaining({
        quantity: 1,
        sticker: 'Front (Sz.2)',
        remarks: ''
      })
    ]);
  });
});

function createCabinet(jobs: unknown[]) {
  return {
    kitchenCabinetType: 'BASE_ONE_DOOR',
    jobs,
    components: [],
    boards: [
      {
        boardName: 'FRONT_NAME',
        boardNameLabel: 'Front',
        boardThickness: 18,
        sideX: 600,
        sideY: 720,
        quantity: 1,
        totalPrice: 100,
        color: 'WHITE',
        veneerX: 0,
        veneerY: 0,
        veneerColor: '',
        priceEntry: { price: 100 }
      }
    ]
  };
}
