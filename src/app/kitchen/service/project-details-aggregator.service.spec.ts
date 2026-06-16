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
                  boardNameLabel: 'Front z backendu',
                  boardThickness: 18,
                  sideX: 500,
                  sideY: 700,
                  quantity: 1,
                  totalPrice: 100,
                  color: 'WHITE',
                  veneerX: 1,
                  veneerY: 0,
                  veneerEdgeLabel: 'przód',
                  veneerColor: 'WHITE',
                  priceEntry: { price: 100 }
                },
                {
                  boardName: 'SIDE_NAME',
                  boardNameLabel: 'Bok z backendu',
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

    expect(frontBoard?.boardLabel).toBe('Front z backendu');
    expect(frontBoard?.veneerEdgeLabel).toBe('przód');
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

  // Iter.5b [A2 C] (2026-05-28) — auto-uwaga dla L-shape wieńców/półek narożnika
  it('should add L-shape cutout remarks for WREATH_L_SHAPE / SHELF_L_SHAPE boards', () => {
    const response = {
      walls: [
        {
          cabinets: [
            {
              kitchenCabinetType: 'CORNER_CABINET',
              boards: [
                {
                  boardName: 'WREATH_L_SHAPE',
                  boardNameLabel: 'Wieniec L-shape (CNC)',
                  boardThickness: 18,
                  sideX: 842,
                  sideY: 712,
                  quantity: 1,
                  totalPrice: 50,
                  color: 'WHITE',
                  veneerX: 0, veneerY: 1, veneerColor: 'WHITE',
                  priceEntry: { price: 50 },
                  lShapeCutoutLengthAMm: 350,
                  lShapeCutoutLengthBMm: 202
                },
                {
                  boardName: 'SHELF_L_SHAPE',
                  boardNameLabel: 'Półka L-shape (CNC)',
                  boardThickness: 18,
                  sideX: 842,
                  sideY: 712,
                  quantity: 1,
                  totalPrice: 50,
                  color: 'WHITE',
                  veneerX: 0, veneerY: 1, veneerColor: 'WHITE',
                  priceEntry: { price: 50 },
                  lShapeCutoutLengthAMm: 350,
                  lShapeCutoutLengthBMm: 202
                },
                {
                  // Prostokątna płyta (WREATH_NAME — SPLIT_RECTANGLES) — bez lShape, bez auto-uwagi L-shape
                  boardName: 'WREATH_NAME',
                  boardNameLabel: 'Wieniec',
                  boardThickness: 18,
                  sideX: 506, sideY: 600,
                  quantity: 1,
                  totalPrice: 30,
                  color: 'WHITE',
                  veneerX: 0, veneerY: 1, veneerColor: 'WHITE',
                  priceEntry: { price: 30 }
                }
              ]
            }
          ]
        }
      ]
    } as unknown as MultiWallCalculateResponse;

    const result = service.aggregate(response, [] as unknown as WallWithCabinets[], {});

    const wreathL = result.boards.find(b => b.material === 'WREATH_L_SHAPE');
    const shelfL = result.boards.find(b => b.material === 'SHELF_L_SHAPE');
    const wreathRect = result.boards.find(b => b.material === 'WREATH_NAME');

    expect(wreathL?.remarks).toContain('L-shape: wycięcie CNC w rogu 350×202 mm');
    expect(shelfL?.remarks).toContain('L-shape: wycięcie CNC w rogu 350×202 mm');
    // Prostokątny wieniec NIE dostaje uwagi L-shape
    expect(wreathRect?.remarks ?? '').not.toContain('L-shape');
  });

  // Iter.6 (Faza 1) — auto-uwaga producenta dla mechanizmów narożnych (Le Mans / Magic Corner), doc §13
  it('should add manufacturer remarks for Le Mans / Magic Corner active front', () => {
    const response = {
      walls: [
        {
          cabinets: [
            {
              kitchenCabinetType: 'CORNER_CABINET',
              cornerMechanism: 'LE_MANS_I',
              boards: [
                {
                  boardName: 'FRONT_NAME',
                  boardNameLabel: 'Front',
                  boardThickness: 18,
                  sideX: 500, sideY: 700,
                  quantity: 1,
                  totalPrice: 80,
                  color: 'WHITE',
                  veneerX: 2, veneerY: 2, veneerColor: 'WHITE',
                  priceEntry: { price: 80 }
                }
              ]
            },
            {
              kitchenCabinetType: 'CORNER_CABINET',
              cornerMechanism: 'MAGIC_CORNER_STANDARD',
              boards: [
                {
                  boardName: 'FRONT_NAME',
                  boardNameLabel: 'Front',
                  boardThickness: 18,
                  sideX: 450, sideY: 700,
                  quantity: 1,
                  totalPrice: 80,
                  color: 'BLACK',
                  veneerX: 2, veneerY: 2, veneerColor: 'BLACK',
                  priceEntry: { price: 80 }
                }
              ]
            }
          ]
        }
      ]
    } as unknown as MultiWallCalculateResponse;

    const result = service.aggregate(response, [] as unknown as WallWithCabinets[], {});

    const leMansFront = result.boards.find(b => b.color === 'WHITE');
    const magicFront = result.boards.find(b => b.color === 'BLACK');

    expect(leMansFront?.remarks).toContain('Le Mans: front 16-19 mm, min. 85 deg otwarcia');
    expect(magicFront?.remarks).toContain('Magic Corner Standard: maks. 75 deg otwarcia');
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

  it('should add BASE_SINK-specific remarks to FRONT (hinge 150mm) and TOP_WREATH (3mm setback)', () => {
    // Książka Wasiak v.2.3 str. 41:
    // - Górny zawias szafki pod zlew: 150mm od góry (zamiast standardowych ~100mm) — żeby ominąć pasek przedni
    // - Pasek przedni cofnięty 3mm względem boków — żeby śruby uchwytu nie kolidowały
    const response = {
      walls: [
        {
          cabinets: [
            {
              kitchenCabinetType: 'BASE_SINK',
              jobs: [
                { category: 'MILLING', type: 'HINGE_MILLING', quantity: 2, totalPrice: 10, priceEntry: { price: 5 } }
              ],
              boards: [
                {
                  boardName: 'FRONT_NAME',
                  boardThickness: 18,
                  sideX: 713,
                  sideY: 596,
                  quantity: 1,
                  totalPrice: 100,
                  veneerX: 0,
                  veneerY: 0,
                  priceEntry: { price: 100 }
                },
                {
                  boardName: 'TOP_WREATH_NAME',
                  boardThickness: 18,
                  sideX: 100,
                  sideY: 564,
                  quantity: 2,
                  totalPrice: 40,
                  veneerX: 0,
                  veneerY: 2,
                  priceEntry: { price: 100 }
                }
              ]
            }
          ]
        }
      ],
      totalWasteCost: 0,
      globalWasteComponents: []
    } as unknown as MultiWallCalculateResponse;

    const result = service.aggregate(response, [] as WallWithCabinets[]);

    const frontBoard = result.boards.find(board => board.material === 'FRONT_NAME');
    const topWreathBoard = result.boards.find(board => board.material === 'TOP_WREATH_NAME');

    expect(frontBoard?.remarks).toContain('puszki');
    expect(frontBoard?.remarks).toContain('Szafka pod zlew: górna puszka zawiasu 150mm od góry');
    expect(topWreathBoard?.remarks).toContain('Pasek przedni cofnięty 3mm względem boków (szafka pod zlew)');
  });

  it('should NOT add sink-specific remarks to non-BASE_SINK cabinets', () => {
    const response = {
      walls: [
        {
          cabinets: [
            {
              kitchenCabinetType: 'BASE_ONE_DOOR',
              jobs: [
                { category: 'MILLING', type: 'HINGE_MILLING', quantity: 2, totalPrice: 10, priceEntry: { price: 5 } }
              ],
              boards: [
                {
                  boardName: 'FRONT_NAME',
                  boardThickness: 18,
                  sideX: 713,
                  sideY: 596,
                  quantity: 1,
                  totalPrice: 100,
                  veneerX: 0,
                  veneerY: 0,
                  priceEntry: { price: 100 }
                },
                {
                  boardName: 'TOP_WREATH_NAME',
                  boardThickness: 18,
                  sideX: 100,
                  sideY: 564,
                  quantity: 2,
                  totalPrice: 40,
                  veneerX: 0,
                  veneerY: 2,
                  priceEntry: { price: 100 }
                }
              ]
            }
          ]
        }
      ],
      totalWasteCost: 0,
      globalWasteComponents: []
    } as unknown as MultiWallCalculateResponse;

    const result = service.aggregate(response, [] as WallWithCabinets[]);

    const frontBoard = result.boards.find(board => board.material === 'FRONT_NAME');
    const topWreathBoard = result.boards.find(board => board.material === 'TOP_WREATH_NAME');

    // Standard hinge remark IS present
    expect(frontBoard?.remarks).toContain('puszki');
    // Sink-specific remarks NOT present
    expect(frontBoard?.remarks ?? '').not.toContain('Szafka pod zlew');
    expect(topWreathBoard?.remarks ?? '').not.toContain('cofnięty 3mm');
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
    expect(result.jobs).toEqual([
      jasmine.objectContaining({
        name: 'CORNER_COUNTERTOP_JOINT_Śc.1-2',
        type: 'COUNTERTOP',
        quantity: 1,
        totalCost: 25
      })
    ]);
  });

  it('should not add a corner countertop joint job when jointCost is zero or missing', () => {
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
          jointCost: 0,
          totalCost: 150,
          components: [],
          pricingComplete: true
        },
        {
          wallAIndex: 1,
          wallBIndex: 2,
          cornerWidthMm: 600,
          cornerDepthMm: 620,
          thicknessMm: 38,
          materialCost: 150,
          jointCost: null,
          totalCost: 150,
          components: [],
          pricingComplete: true
        }
      ]
    } as unknown as MultiWallCalculateResponse;

    const result = service.aggregate(response, [] as WallWithCabinets[]);

    expect(result.jobs.some(job => job.name.startsWith('CORNER_COUNTERTOP_JOINT_'))).toBe(false);
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
