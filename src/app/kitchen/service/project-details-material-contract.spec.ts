import { TestBed } from '@angular/core/testing';
import { Board } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { KitchenCostsSectionComponent } from '../costs-section/kitchen-costs-section.component';
import { MultiWallCalculateResponse } from '../model/kitchen-project.model';
import { ProjectDetailsAggregatorService } from './project-details-aggregator.service';
import { buildBoardExcelRows, sumAggregatedBoardsCost } from './kitchen-project-summary.utils';

describe('Project details material contract', () => {
  const translations = { 'MATERIAL.CHIPBOARD': 'Płyta wiórowa', 'MATERIAL.MDF': 'MDF' };

  function aggregate(...boards: Board[]) {
    const response = {
      walls: boards.map(board => ({
        cabinets: [{ kitchenCabinetType: 'BASE_ONE_DOOR', boards: [board] }]
      }))
    } as unknown as MultiWallCalculateResponse;
    return new ProjectDetailsAggregatorService().aggregate(response, [], translations);
  }

  it('keeps same-sized, same-colored fronts of different materials separate across walls', () => {
    const result = aggregate(front('CHIPBOARD', 100), front('MDF', 200));

    expect(result.boards).toEqual([
      jasmine.objectContaining({ material: 'FRONT_NAME', boardMaterial: 'CHIPBOARD',
        quantity: 1, unitCost: 100, totalCost: 43.2, cabinetRefs: ['Sz.1'] }),
      jasmine.objectContaining({ material: 'FRONT_NAME', boardMaterial: 'MDF',
        quantity: 1, unitCost: 200, totalCost: 86.4, cabinetRefs: ['Sz.2'] })
    ]);
    expect(sumAggregatedBoardsCost(result.boards)).toBeCloseTo(129.6);
  });

  it('keeps varnished and unvarnished fronts separate even for the same material', () => {
    const result = aggregate(front('MDF', 100), { ...front('MDF', 200), varnished: true });

    expect(result.boards).toEqual([
      jasmine.objectContaining({ boardMaterial: 'MDF', varnished: false, quantity: 1, unitCost: 100 }),
      jasmine.objectContaining({ boardMaterial: 'MDF', varnished: true, quantity: 1, unitCost: 200 })
    ]);
  });

  it('still merges identical material and finish and preserves quantities, references and costs', () => {
    const result = aggregate(front('MDF', 100), { ...front('MDF', 100), quantity: 2, totalPrice: 86.4 });

    expect(result.boards).toEqual([
      jasmine.objectContaining({ boardMaterial: 'MDF', quantity: 3, unitCost: 100,
        cabinetRefs: ['Sz.1', 'Sz.2'] })
    ]);
    expect(sumAggregatedBoardsCost(result.boards)).toBeCloseTo(129.6);
  });

  it('preserves legacy aggregation when the response has no material or varnish fields', () => {
    const legacy = front(undefined, 100);
    delete legacy.varnished;
    const result = aggregate(legacy, { ...legacy, varnished: false });

    expect(result.boards.length).toBe(1);
    expect(result.boards[0].quantity).toBe(2);
    expect(result.boards[0].totalCost).toBeCloseTo(86.4);
  });

  it('exports separate materials without losing decor, production remarks or grain orientation', () => {
    const chipboard = { ...front('CHIPBOARD', 100), hingeCountPerPiece: 2, hingeEdgeLengthMm: 720 };
    const mdf = { ...front('MDF', 200), varnished: true, grainAxis: 'ALONG_SIDE_Y' as const };
    const rows = buildBoardExcelRows(aggregate(chipboard, mdf).boards, translations, {});

    expect(rows.length).toBe(2);
    expect(rows[0]).toEqual(jasmine.objectContaining({ quantity: 1, symbol: 'WHITE', sticker: 'Front (Sz.1)' }));
    expect(rows[0].remarks).toContain('Materiał: Płyta wiórowa');
    expect(rows[0].remarks).toContain('Puszki zawiasów: 2 na front');
    expect(rows[1]).toEqual(jasmine.objectContaining({ quantity: 1, symbol: 'WHITE',
      sticker: 'Front (Sz.2)', length: 600, width: 720 }));
    expect(rows[1].remarks).toContain('Materiał: MDF');
    expect(rows[1].remarks).toContain('Lakierowane');
  });

  it('uses the actual translated material when exporting a board without a decor code', () => {
    const board = { ...front('CHIPBOARD', 100), color: '' };
    const [row] = buildBoardExcelRows(aggregate(board).boards, translations, {});

    expect(row.symbol).toBe('Płyta wiórowa');
    expect(row.sticker).toBe('Front (Sz.1)');
  });

  it('shows the distinct material and varnish finish in the BOM cost rows', async () => {
    await TestBed.configureTestingModule({ imports: [KitchenCostsSectionComponent] }).compileComponents();
    const fixture = TestBed.createComponent(KitchenCostsSectionComponent);
    fixture.componentRef.setInput('projectResult', { walls: [], allFit: true });
    fixture.componentRef.setInput('aggregatedBoards', aggregate(front('CHIPBOARD', 100),
      { ...front('MDF', 200), varnished: true }).boards);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.bom-table tbody tr') as NodeListOf<HTMLElement>;
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Płyta wiórowa');
    expect(rows[1]?.textContent).toContain('MDF');
    expect(rows[1]?.textContent).toContain('Lakierowane');
  });
});

function front(material: string | undefined, unitPrice: number): Board {
  return {
    boardName: 'FRONT_NAME', boardNameLabel: 'Front', material, varnished: false,
    boardThickness: 18, sideX: 720, sideY: 600, quantity: 1, color: 'WHITE',
    veneerX: 2, veneerY: 2, veneerColor: 'WHITE', grainAxis: 'ALONG_SIDE_X',
    priceEntry: { price: unitPrice, unit: 'M2' }, totalPrice: unitPrice * 0.432, remarks: ''
  };
}
