import { ProjectDetailsAggregatorService } from './project-details-aggregator.service';
import { MultiWallCalculateResponse, WallCalculationSummary } from '../model/kitchen-project.model';
import { WallWithCabinets } from '../model/kitchen-state.model';

describe('ProjectDetailsAggregatorService', () => {
  let service: ProjectDetailsAggregatorService;

  beforeEach(() => {
    service = new ProjectDetailsAggregatorService();
  });

  it('should aggregate boards, components and jobs from cabinets and wall add-ons', () => {
    const response = {
      walls: [
        {
          cabinets: [
            {
              jobs: [
                { category: 'MILLING', type: 'HINGE_MILLING', quantity: 2, totalPrice: 10, priceEntry: { price: 5 } },
                { category: 'CUTTING', type: 'GROOVE_FOR_HDF', quantity: 1, totalPrice: 8, priceEntry: { price: 8 } }
              ],
              boards: [
                {
                  boardName: 'FRONT_NAME',
                  boardThickness: 18,
                  sideX: 500,
                  sideY: 700,
                  quantity: 1,
                  totalPrice: 100,
                  color: 'WHITE',
                  veneerX: 1,
                  veneerY: 0,
                  veneerColor: 'WHITE',
                  priceEntry: { price: 100 }
                },
                {
                  boardName: 'SIDE_NAME',
                  boardThickness: 18,
                  sideX: 500,
                  sideY: 700,
                  quantity: 1,
                  totalPrice: 80,
                  color: 'WHITE',
                  veneerX: 0,
                  veneerY: 0,
                  veneerColor: '',
                  priceEntry: { price: 80 }
                }
              ],
              components: [
                { category: 'HINGE', model: 'CLIP_TOP', quantity: 4, totalPrice: 20, priceEntry: { price: 5 } }
              ]
            }
          ],
          countertop: {
            enabled: true,
            materialType: 'LAMINATE',
            segments: [
              { thicknessMm: 38, lengthMm: 2000, depthMm: 600, materialCost: 200, cuttingCost: 30, edgingCost: 10 }
            ],
            components: [
              { category: 'COUNTERTOP_ACCESSORY', model: 'BOLT', quantity: 2, totalPrice: 12, priceEntry: { price: 6 } }
            ]
          },
          plinth: {
            enabled: true,
            materialType: 'MDF_LAMINATED',
            segments: [
              { lengthMm: 1800, heightMm: 100, materialCost: 60, cuttingCost: 15 }
            ],
            components: [
              { category: 'PLINTH', model: 'CLIP', quantity: 8, totalPrice: 16, priceEntry: { price: 2 } }
            ]
          },
          fillerPanels: [
            {
              fillerType: 'SIDE',
              thicknessMm: 18,
              widthMm: 50,
              heightMm: 720,
              materialCost: 25,
              cuttingCost: 5,
              veneerCost: 4,
              components: [
                { category: 'FILLER', model: 'SCREW', quantity: 4, totalPrice: 4, priceEntry: { price: 1 } }
              ]
            }
          ],
          enclosures: [
            {
              leftSide: true,
              boards: [
                { label: 'Panel', thicknessMm: 18, widthMm: 600, heightMm: 720, materialCost: 55 }
              ],
              cuttingCost: 12
            }
          ],
          upperFiller: {
            enabled: true,
            segments: [
              { segmentIndex: 0, requiresJoint: true, lengthMm: 1200, heightMm: 100, materialCost: 40, cuttingCost: 6 }
            ]
          }
        }
      ],
      totalWasteCost: 22,
      globalWasteComponents: [
        { category: 'SHEET_WASTE', model: 'WASTE', quantity: 1, totalPrice: 22, priceEntry: { price: 22 } }
      ]
    } as unknown as MultiWallCalculateResponse;

    const frontendWalls = [
      {
        plinthConfig: { thicknessMm: 21 }
      }
    ] as unknown as WallWithCabinets[];

    const result = service.aggregate(response, frontendWalls, {
      'BOARD_NAME.FRONT_NAME': 'Front tlumaczony'
    });

    const frontBoard = result.boards.find(board => board.material === 'FRONT_NAME');
    const sideBoard = result.boards.find(board => board.material === 'SIDE_NAME');
    const plinthBoard = result.boards.find(board => board.material === 'COKOL_MDF_LAMINATED');
    const countertopBoard = result.boards.find(board => board.material === 'BLAT_LAMINATE');
    const upperFillerBoard = result.boards.find(board => board.material.includes('Blenda górna'));

    expect(frontBoard?.boardLabel).toBe('Front tlumaczony');
    expect(frontBoard?.remarks).toContain('puszki');
    expect(frontBoard?.cabinetRefs).toEqual(['Sz.1']);
    expect(sideBoard?.remarks).toContain('Frezowanie nutu pod HDF');
    expect(plinthBoard?.thickness).toBe(21);
    expect(countertopBoard?.totalCost).toBe(200);
    expect(upperFillerBoard?.totalCost).toBe(40);

    expect(result.components.some(component => component.name === 'CLIP_TOP')).toBeTrue();
    expect(result.components.some(component => component.name === 'WASTE' && component.isWaste)).toBeTrue();
    expect(result.jobs.some(job => job.name === 'COUNTERTOP_CUTTING' && job.totalCost === 30)).toBeTrue();
    expect(result.jobs.some(job => job.name === 'PLINTH_CUTTING' && job.totalCost === 15)).toBeTrue();
    expect(result.wasteCost).toBe(22);
  });

  it('should merge duplicate components and jobs across walls', () => {
    const response = {
      walls: [
        {
          cabinets: [
            {
              jobs: [
                { category: 'ASSEMBLY', type: 'SCREWING', quantity: 2, totalPrice: 10, priceEntry: { price: 5 } }
              ],
              components: [
                { category: 'HINGE', model: 'CLIP_TOP', quantity: 2, totalPrice: 10, priceEntry: { price: 5 } }
              ]
            }
          ]
        },
        {
          cabinets: [
            {
              jobs: [
                { category: 'ASSEMBLY', type: 'SCREWING', quantity: 3, totalPrice: 15, priceEntry: { price: 5 } }
              ],
              components: [
                { category: 'HINGE', model: 'CLIP_TOP', quantity: 1, totalPrice: 5, priceEntry: { price: 5 } }
              ]
            }
          ]
        }
      ],
      totalWasteCost: 0,
      globalWasteComponents: []
    } as unknown as MultiWallCalculateResponse;

    const result = service.aggregate(response, [] as WallWithCabinets[]);

    expect(result.components).toEqual([
      jasmine.objectContaining({
        name: 'CLIP_TOP',
        type: 'HINGE',
        quantity: 3,
        totalCost: 15
      })
    ]);
    expect(result.jobs).toEqual([
      jasmine.objectContaining({
        name: 'SCREWING',
        type: 'ASSEMBLY',
        quantity: 5,
        totalCost: 25
      })
    ]);
  });

  it('should aggregate corner countertops and their components', () => {
    const response = {
      walls: [],
      totalWasteCost: 0,
      globalWasteComponents: [],
      cornerCountertops: [
        {
          wallAIndex: 0,
          wallBIndex: 1,
          cornerWidthMm: 600,
          cornerDepthMm: 620,
          thicknessMm: 38,
          materialCost: 150,
          jointCost: 25,
          totalCost: 175,
          components: [
            { category: 'COUNTERTOP_ACCESSORY', model: 'MITER_BOLT', quantity: 2, totalPrice: 14, priceEntry: { price: 7 } }
          ],
          pricingComplete: true
        }
      ]
    } as unknown as MultiWallCalculateResponse;

    const result = service.aggregate(response, [] as WallWithCabinets[]);

    expect(result.boards).toEqual([
      jasmine.objectContaining({
        material: 'Blat narożny [Śc.1-2]',
        width: 600,
        height: 620,
        totalCost: 150
      })
    ]);
    expect(result.components).toEqual([
      jasmine.objectContaining({
        name: 'MITER_BOLT',
        quantity: 2,
        totalCost: 14
      })
    ]);
  });

  it('should collect pricing warnings from wall and corner countertop responses', () => {
    const wallResult = {
      countertop: { pricingComplete: false, missingPriceEntries: ['COUNTERTOP.MATERIAL'] },
      plinth: { pricingComplete: false, missingPriceEntries: ['PLINTH.MATERIAL'] },
      fillerPanels: [
        { pricingComplete: false, missingPriceEntries: ['FILLER.MATERIAL'] },
        { pricingComplete: false, missingPriceEntries: ['FILLER.MATERIAL'] }
      ],
      enclosures: [
        { pricingComplete: false, missingPriceEntries: ['ENCLOSURE.MATERIAL'] }
      ],
      upperFiller: { pricingComplete: false, missingPriceEntries: ['UPPER_FILLER.MATERIAL'] }
    } as unknown as WallCalculationSummary;

    const wallWarnings = service.collectPricingWarnings(wallResult);
    const cornerWarnings = service.collectCornerCountertopPricingWarnings([
      { pricingComplete: false, missingPriceEntries: ['CORNER_COUNTERTOP.MATERIAL'] },
      { pricingComplete: false, missingPriceEntries: ['CORNER_COUNTERTOP.MATERIAL', 'CORNER_COUNTERTOP.JOINT'] }
    ] as unknown as MultiWallCalculateResponse['cornerCountertops']);

    expect(wallWarnings).toEqual([
      'COUNTERTOP.MATERIAL',
      'PLINTH.MATERIAL',
      'FILLER.MATERIAL',
      'ENCLOSURE.MATERIAL',
      'UPPER_FILLER.MATERIAL'
    ]);
    expect(cornerWarnings).toEqual([
      'CORNER_COUNTERTOP.MATERIAL',
      'CORNER_COUNTERTOP.JOINT'
    ]);
  });
});
