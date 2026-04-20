import {
  buildBoardExcelRows,
  buildBoardExcelFilename,
  calculateAdjustedComponentCost,
  calculateAdjustedTotalCost,
  calculateBomPriceWarning,
  sumAggregatedBoardsCost,
  sumAggregatedComponentsCost,
  sumAggregatedJobsCost
} from './kitchen-project-summary.utils';
import { AggregatedBoard, AggregatedComponent, AggregatedJob } from './project-details-aggregator.service';

describe('kitchen-project-summary.utils', () => {
  it('should calculate BOM warning only for missing non-waste prices', () => {
    const warning = calculateBomPriceWarning(
      [
        { unitCost: 0 } as AggregatedBoard,
        { unitCost: 10 } as AggregatedBoard
      ],
      [
        { unitCost: 0, isWaste: false } as AggregatedComponent,
        { unitCost: 0, isWaste: true } as AggregatedComponent
      ],
      [
        { unitCost: 0 } as AggregatedJob
      ]
    );

    expect(warning).toBe('Brak cen dla: 1 płyt, 1 komponentów, 1 prac. Wycena będzie niepełna.');
  });

  it('should compute adjusted totals with optional waste cost', () => {
    expect(calculateAdjustedTotalCost({
      totalProjectCost: 1000,
      totalWasteCost: 120
    } as any, true)).toBe(1000);
    expect(calculateAdjustedTotalCost({
      totalProjectCost: 1000,
      totalWasteCost: 120
    } as any, false)).toBe(880);

    expect(calculateAdjustedComponentCost({
      totalComponentCost: 300,
      totalWasteCost: 120
    } as any, true)).toBe(420);
    expect(calculateAdjustedComponentCost({
      totalComponentCost: 300,
      totalWasteCost: 120
    } as any, false)).toBe(300);
  });

  it('should sum aggregated costs and skip hidden waste components when needed', () => {
    expect(sumAggregatedBoardsCost([
      { totalCost: 100 } as AggregatedBoard,
      { totalCost: 50 } as AggregatedBoard
    ])).toBe(150);

    expect(sumAggregatedComponentsCost([
      { totalCost: 40, isWaste: false } as AggregatedComponent,
      { totalCost: 15, isWaste: true } as AggregatedComponent
    ], false)).toBe(40);

    expect(sumAggregatedComponentsCost([
      { totalCost: 40, isWaste: false } as AggregatedComponent,
      { totalCost: 15, isWaste: true } as AggregatedComponent
    ], true)).toBe(55);

    expect(sumAggregatedJobsCost([
      { totalCost: 20 } as AggregatedJob,
      { totalCost: 35 } as AggregatedJob
    ])).toBe(55);
  });

  it('should build excel rows and sanitize filename', () => {
    const rows = buildBoardExcelRows([
      {
        quantity: 2,
        color: '',
        material: 'CHIPBOARD',
        thickness: 18,
        height: 720,
        veneerY: 2,
        width: 560,
        veneerX: 1,
        veneerColor: 'white',
        boardLabel: 'Bok',
        cabinetRefs: ['S1', 'S2'],
        remarks: 'uwaga',
        veneerEdgeLabel: 'ABS'
      } as AggregatedBoard
    ], {
      'MATERIAL.CHIPBOARD': 'Płyta wiórowa'
    }, {
      CHIPBOARD: 'Fallback'
    });

    expect(rows[0]).toEqual(jasmine.objectContaining({
      lp: 1,
      symbol: 'Płyta wiórowa',
      sticker: 'Bok (S1, S2)'
    }));

    const filename = buildBoardExcelFilename('Projekt / klient', new Date('2026-04-17T10:00:00Z'));
    expect(filename).toBe('kuchnia_plyty_Projekt___klient_20260417.xlsx');
  });
});
