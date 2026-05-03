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

  it('should map base open cabinet from form data without front-specific fields', () => {
    const cabinet = factory.fromFormData({
      kitchenCabinetType: KitchenCabinetType.BASE_OPEN,
      openingType: 'NONE',
      width: 500,
      height: 720,
      depth: 560,
      positionY: 0,
      shelfQuantity: 2
    } as CabinetFormData, 'open-1', {
      boards: [],
      components: [],
      jobs: [],
      summaryCosts: 300,
      boardTotalCost: 200,
      componentTotalCost: 50,
      jobTotalCost: 50
    });

    expect(cabinet).toEqual(jasmine.objectContaining({
      id: 'open-1',
      type: KitchenCabinetType.BASE_OPEN,
      openingType: 'NONE',
      shelfQuantity: 2
    }));
  });

  it('should map cargo cabinet from form data and preserve drawer variant details', () => {
    const cabinet = factory.fromFormData({
      kitchenCabinetType: KitchenCabinetType.BASE_CARGO,
      openingType: 'HANDLE',
      width: 300,
      height: 720,
      depth: 560,
      positionY: 0,
      shelfQuantity: 0,
      cargoVariant: 'DRAWERS',
      drawerQuantity: 2,
      drawerModel: 'SEVROLL_BALL'
    } as CabinetFormData, 'cargo-1', {
      boards: [],
      components: [],
      jobs: [],
      summaryCosts: 500,
      boardTotalCost: 200,
      componentTotalCost: 200,
      jobTotalCost: 100
    });

    expect(cabinet).toEqual(jasmine.objectContaining({
      id: 'cargo-1',
      type: KitchenCabinetType.BASE_CARGO,
      cargoVariant: 'DRAWERS',
      drawerQuantity: 2,
      drawerModel: 'SEVROLL_BALL'
    }));
  });

  it('should map mechanism cargo from form data with brand and basket quantity', () => {
    const cabinet = factory.fromFormData({
      kitchenCabinetType: KitchenCabinetType.BASE_CARGO,
      openingType: 'HANDLE',
      width: 350,
      height: 720,
      depth: 560,
      positionY: 0,
      shelfQuantity: 0,
      cargoVariant: 'MECHANISM',
      cargoBrand: 'GTV',
      drawerQuantity: 2
    } as CabinetFormData, 'cargo-mech-1', {
      boards: [],
      components: [],
      jobs: [],
      summaryCosts: 500,
      boardTotalCost: 200,
      componentTotalCost: 200,
      jobTotalCost: 100
    });

    expect(cabinet).toEqual(jasmine.objectContaining({
      id: 'cargo-mech-1',
      type: KitchenCabinetType.BASE_CARGO,
      cargoVariant: 'MECHANISM',
      cargoBrand: 'GTV',
      drawerQuantity: 2,
      drawerModel: undefined
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

  it('should map placement response for cargo cabinet', () => {
    const cargoCabinet = factory.fromPlacementResponse({
      id: 3,
      cabinetId: 'cargo-1',
      cabinetType: KitchenCabinetType.BASE_CARGO,
      positionX: 0,
      positionY: 0,
      widthMm: 300,
      heightMm: 720,
      depthMm: 560,
      boxMaterialCode: 'CHIPBOARD',
      boxThicknessMm: 18,
      boxColorCode: 'WHITE',
      cargoVariant: 'DRAWERS',
      drawerQuantity: 3,
      drawerModel: 'ANTARO_TANDEMBOX',
      boardsCost: 90,
      componentsCost: 120,
      jobsCost: 30,
      totalCost: 240,
      displayOrder: 0
    }, 'fallback-cargo');

    expect(cargoCabinet).toEqual(jasmine.objectContaining({
      id: 'cargo-1',
      type: KitchenCabinetType.BASE_CARGO,
      cargoVariant: 'DRAWERS',
      drawerQuantity: 3,
      drawerModel: 'ANTARO_TANDEMBOX'
    }));
  });

  it('should map placement response for base open cabinet', () => {
    const openCabinet = factory.fromPlacementResponse({
      id: 5,
      cabinetId: 'open-1',
      cabinetType: KitchenCabinetType.BASE_OPEN,
      positionX: 0,
      positionY: 0,
      widthMm: 500,
      heightMm: 720,
      depthMm: 560,
      boxMaterialCode: 'CHIPBOARD',
      boxThicknessMm: 18,
      boxColorCode: 'WHITE',
      openingType: 'NONE',
      shelfQuantity: 2,
      boardsCost: 90,
      componentsCost: 30,
      jobsCost: 20,
      totalCost: 140,
      displayOrder: 0
    }, 'fallback-open');

    expect(openCabinet).toEqual(jasmine.objectContaining({
      id: 'open-1',
      type: KitchenCabinetType.BASE_OPEN,
      openingType: 'NONE',
      shelfQuantity: 2
    }));
  });

  it('should map pantry passage front type from form data and placement response', () => {
    const fromForm = factory.fromFormData({
      kitchenCabinetType: KitchenCabinetType.PANTRY_PASSAGE,
      openingType: 'HANDLE',
      width: 550,
      height: 2200,
      depth: 120,
      positionY: 0,
      shelfQuantity: 0,
      pantryPassageFrontType: 'ONE_DOOR'
    } as CabinetFormData, 'passage-1', {
      boards: [],
      components: [],
      jobs: [],
      summaryCosts: 300,
      boardTotalCost: 200,
      componentTotalCost: 50,
      jobTotalCost: 50
    });

    const fromPlacement = factory.fromPlacementResponse({
      id: 6,
      cabinetId: 'passage-1',
      cabinetType: KitchenCabinetType.PANTRY_PASSAGE,
      positionX: 0,
      positionY: 0,
      widthMm: 550,
      heightMm: 2200,
      depthMm: 120,
      boxMaterialCode: 'MDF',
      boxThicknessMm: 18,
      boxColorCode: 'WHITE',
      pantryPassageFrontType: 'ONE_DOOR',
      boardsCost: 90,
      componentsCost: 30,
      jobsCost: 20,
      totalCost: 140,
      displayOrder: 0
    }, 'fallback-passage');

    expect(fromForm).toEqual(jasmine.objectContaining({
      type: KitchenCabinetType.PANTRY_PASSAGE,
      pantryPassageFrontType: 'ONE_DOOR'
    }));
    expect(fromPlacement).toEqual(jasmine.objectContaining({
      type: KitchenCabinetType.PANTRY_PASSAGE,
      pantryPassageFrontType: 'ONE_DOOR'
    }));
  });

  it('should map placement response for cargo mechanism with brand and basket quantity', () => {
    const cargoCabinet = factory.fromPlacementResponse({
      id: 4,
      cabinetId: 'cargo-mechanism-1',
      cabinetType: KitchenCabinetType.BASE_CARGO,
      positionX: 0,
      positionY: 0,
      widthMm: 350,
      heightMm: 720,
      depthMm: 560,
      boxMaterialCode: 'CHIPBOARD',
      boxThicknessMm: 18,
      boxColorCode: 'WHITE',
      cargoVariant: 'MECHANISM',
      cargoBrand: 'BLUM',
      drawerQuantity: 2,
      boardsCost: 90,
      componentsCost: 120,
      jobsCost: 30,
      totalCost: 240,
      displayOrder: 0
    }, 'fallback-cargo');

    expect(cargoCabinet).toEqual(jasmine.objectContaining({
      id: 'cargo-mechanism-1',
      type: KitchenCabinetType.BASE_CARGO,
      cargoVariant: 'MECHANISM',
      cargoBrand: 'BLUM',
      drawerQuantity: 2,
      drawerModel: undefined
    }));
  });
});
