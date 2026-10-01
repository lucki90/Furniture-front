import { AggregatedBoard } from './project-details-aggregation.models';
import { ProjectDetailsAggregationAccumulator } from './project-details-aggregation-accumulator';

describe('ProjectDetailsAggregationAccumulator', () => {
  let accumulator: ProjectDetailsAggregationAccumulator;
  let boards: Map<string, AggregatedBoard>;

  beforeEach(() => {
    accumulator = new ProjectDetailsAggregationAccumulator();
    boards = accumulator.createMaps().boards;
  });

  it('keeps identical boards separate when their production remarks differ', () => {
    accumulator.addBoard(boards, createFrontBoard('Sz.1', '2 puszki na długość 720mm'));
    accumulator.addBoard(boards, createFrontBoard('Sz.2'));

    expect(Array.from(boards.values())).toEqual([
      jasmine.objectContaining({
        cabinetRefs: ['Sz.1'],
        quantity: 1,
        remarks: '2 puszki na długość 720mm'
      }),
      jasmine.objectContaining({
        cabinetRefs: ['Sz.2'],
        quantity: 1,
        remarks: undefined
      })
    ]);
  });

  it('still merges boards with the same production remarks', () => {
    accumulator.addBoard(boards, createFrontBoard('Sz.1', '2 puszki na długość 720mm'));
    accumulator.addBoard(boards, createFrontBoard('Sz.2', '2 puszki na długość 720mm'));

    expect(Array.from(boards.values())).toEqual([
      jasmine.objectContaining({
        cabinetRefs: ['Sz.1', 'Sz.2'],
        quantity: 2,
        totalCost: 200,
        remarks: '2 puszki na długość 720mm'
      })
    ]);
  });
});

function createFrontBoard(cabinetRef: string, remarks?: string): AggregatedBoard {
  return {
    material: 'FRONT_NAME',
    thickness: 18,
    width: 600,
    height: 720,
    quantity: 1,
    unitCost: 100,
    totalCost: 100,
    color: 'WHITE',
    veneerX: 0,
    veneerY: 0,
    veneerColor: '',
    boardLabel: 'Front',
    cabinetRefs: [cabinetRef],
    remarks
  };
}
