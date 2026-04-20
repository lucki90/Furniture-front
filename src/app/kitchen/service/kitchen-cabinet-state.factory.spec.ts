import { TestBed } from '@angular/core/testing';
import { KitchenCabinetStateFactory } from './kitchen-cabinet-state.factory';
import { ProjectRequestBuilderService } from './project-request-builder.service';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { CabinetFormData } from '../model/kitchen-state.model';

describe('KitchenCabinetStateFactory', () => {
  let factory: KitchenCabinetStateFactory;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [KitchenCabinetStateFactory, ProjectRequestBuilderService]
    });

    factory = TestBed.inject(KitchenCabinetStateFactory);
  });

  it('should build typed cabinets from form data with defaults', () => {
    const cabinet = factory.fromFormData({
      kitchenCabinetType: KitchenCabinetType.BASE_SINK,
      openingType: 'HANDLE',
      width: 800,
      height: 720,
      depth: 560,
      positionY: 0,
      shelfQuantity: 1
    } as CabinetFormData, 'cab-1', {
      boards: [],
      components: [],
      jobs: [],
      summaryCosts: 1000,
      boardTotalCost: 400,
      componentTotalCost: 350,
      jobTotalCost: 250
    });

    expect(cabinet).toEqual(jasmine.objectContaining({
      id: 'cab-1',
      type: KitchenCabinetType.BASE_SINK,
      sinkFrontType: 'ONE_DOOR',
      sinkApronEnabled: true,
      sinkApronHeightMm: 150,
      calculatedResult: jasmine.objectContaining({
        totalCost: 1000,
        boardCosts: 400,
        componentCosts: 350,
        jobCosts: 250
      })
    }));
  });

  it('should map placement responses for corner and cascade cabinets', () => {
    const cornerCabinet = factory.fromPlacementResponse({
      id: 1,
      cabinetId: 'corner-1',
      cabinetType: KitchenCabinetType.CORNER_CABINET,
      positionX: 0,
      positionY: 0,
      widthMm: 900,
      heightMm: 720,
      depthMm: 900,
      boxMaterialCode: 'CHIPBOARD',
      boxThicknessMm: 18,
      boxColorCode: 'WHITE',
      cornerWidthA: 950,
      cornerWidthB: 870,
      cornerMechanism: 'LE_MANS',
      cornerShelfQuantity: 2,
      isUpperCorner: false,
      cornerOpeningType: 'BIFOLD',
      boardsCost: 100,
      componentsCost: 50,
      jobsCost: 20,
      totalCost: 170,
      displayOrder: 0
    }, 'cabinet-1');

    const cascadeCabinet = factory.fromPlacementResponse({
      id: 2,
      cabinetId: 'cascade-1',
      cabinetType: KitchenCabinetType.UPPER_CASCADE,
      positionX: 0,
      positionY: 1200,
      widthMm: 800,
      heightMm: 720,
      depthMm: 350,
      boxMaterialCode: 'CHIPBOARD',
      boxThicknessMm: 18,
      boxColorCode: 'WHITE',
      cascadeSegments: [
        { orderIndex: 0, height: 410, depth: 420, frontType: 'UPWARDS', shelfQuantity: 0, isLiftUp: true, isFrontExtended: true },
        { orderIndex: 1, height: 330, depth: 300, frontType: 'ONE_DOOR', shelfQuantity: 0, isLiftUp: false, isFrontExtended: false }
      ],
      boardsCost: 120,
      componentsCost: 60,
      jobsCost: 30,
      totalCost: 210,
      displayOrder: 1
    }, 'cabinet-2');

    expect(cornerCabinet).toEqual(jasmine.objectContaining({
      id: 'corner-1',
      type: KitchenCabinetType.CORNER_CABINET,
      width: 950,
      cornerWidthA: 950,
      cornerWidthB: 870,
      cornerMechanism: 'LE_MANS'
    }));
    expect(cascadeCabinet).toEqual(jasmine.objectContaining({
      id: 'cascade-1',
      type: KitchenCabinetType.UPPER_CASCADE,
      cascadeLowerHeight: 410,
      cascadeLowerDepth: 420,
      cascadeLowerIsLiftUp: true,
      cascadeLowerIsFrontExtended: true,
      cascadeUpperHeight: 330,
      cascadeUpperDepth: 300,
      cascadeUpperIsLiftUp: false
    }));
  });
});
