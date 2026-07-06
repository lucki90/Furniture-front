import { Board, CabinetResponse } from '../../cabinet-form/model/kitchen-cabinet-form.model';

export function boardFixture(
  boardName: string,
  sideX: number,
  sideY: number,
  boardThickness: number,
  quantity = 1,
  overrides: Partial<Board> = {}
): Board {
  return {
    boardName,
    boardNameLabel: boardName,
    quantity,
    sideX,
    sideY,
    boardThickness,
    veneerX: 0,
    veneerY: 0,
    color: 'WHITE',
    veneerColor: 'WHITE',
    priceEntry: { price: 0, unit: 'm2' },
    totalPrice: 0,
    remarks: '',
    ...overrides
  };
}

export function cabinetResponseFixture(
  boards: Board[] = [],
  overrides: Partial<CabinetResponse> = {}
): CabinetResponse {
  return {
    boards,
    components: [],
    jobs: [],
    summaryCosts: 0,
    boardTotalCost: 0,
    componentTotalCost: 0,
    jobTotalCost: 0,
    ...overrides
  };
}
