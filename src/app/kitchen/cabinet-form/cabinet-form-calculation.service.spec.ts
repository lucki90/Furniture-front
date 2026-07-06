import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CabinetFormData } from '../model/kitchen-state.model';
import { KitchenService } from '../service/kitchen.service';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { MaterialDefaults } from './type-config/request-mapper/kitchen-cabinet-request-mapper';
import { CabinetFormCalculationService } from './cabinet-form-calculation.service';
import { KitchenStateService } from '../service/kitchen-state.service';

describe('CabinetFormCalculationService', () => {
  let service: CabinetFormCalculationService;
  let kitchenServiceSpy: jasmine.SpyObj<KitchenService>;
  let kitchenStateServiceStub: {
    getPlinthConfig: jasmine.Spy;
    selectedWall: jasmine.Spy;
    plinthHeightMm: jasmine.Spy;
    plinthSetbackMm: jasmine.Spy;
    getCabinetById: jasmine.Spy;
  };

  beforeEach(() => {
    kitchenServiceSpy = jasmine.createSpyObj<KitchenService>('KitchenService', ['calculateCabinet']);
    kitchenStateServiceStub = {
      getPlinthConfig: jasmine.createSpy('getPlinthConfig').and.returnValue(undefined),
      selectedWall: jasmine.createSpy('selectedWall').and.returnValue({ id: 'wall-1', type: 'MAIN' }),
      plinthHeightMm: jasmine.createSpy('plinthHeightMm').and.returnValue(100),
      plinthSetbackMm: jasmine.createSpy('plinthSetbackMm').and.returnValue(40),
      getCabinetById: jasmine.createSpy('getCabinetById').and.returnValue(undefined)
    };

    TestBed.configureTestingModule({
      providers: [
        CabinetFormCalculationService,
        { provide: KitchenService, useValue: kitchenServiceSpy },
        { provide: KitchenStateService, useValue: kitchenStateServiceStub }
      ]
    });

    service = TestBed.inject(CabinetFormCalculationService);
  });

  it('maps form data with the type mapper and returns a calculated event', (done) => {
    const formData: CabinetFormData = {
      kitchenCabinetType: KitchenCabinetType.BASE_ONE_DOOR,
      name: 'Base',
      openingType: 'HANDLE',
      width: 600,
      height: 720,
      depth: 560,
      shelfQuantity: 1,
      positionY: 0
    };
    const materialDefaults: MaterialDefaults = {
      boxMaterial: 'CHIPBOARD',
      boxBoardThickness: 18,
      boxColor: 'WHITE',
      frontMaterial: 'MDF',
      frontBoardThickness: 18,
      frontColor: 'BLACK',
      backMaterial: 'HDF',
      backBoardThickness: 3,
      varnishedFront: false
    };
    const response = { id: 101 } as any;

    kitchenServiceSpy.calculateCabinet.and.returnValue(of(response));

    service.calculateCabinet(KitchenCabinetType.BASE_ONE_DOOR, formData, materialDefaults, 'cab-1')
      .subscribe(event => {
        expect(kitchenServiceSpy.calculateCabinet).toHaveBeenCalledTimes(1);
        expect(kitchenServiceSpy.calculateCabinet.calls.mostRecent().args[0]).toEqual(
          jasmine.objectContaining({
            kitchenCabinetType: KitchenCabinetType.BASE_ONE_DOOR,
            width: 600,
            height: 720,
            depth: 560
          })
        );
        expect(event).toEqual({
          formData: {
            ...formData,
            materialRequest: {
              boxMaterial: 'CHIPBOARD',
              boxBoardThickness: 18,
              boxColor: 'WHITE',
              boxVeneerColor: 'WHITE',
              frontMaterial: 'MDF',
              frontBoardThickness: 18,
              frontColor: 'BLACK',
              frontVeneerColor: 'BLACK'
            },
            varnishedFront: false,
            materialPresetCode: null
          },
          result: response,
          editingCabinetId: 'cab-1'
        });
        done();
      });
  });

  it('uses persisted cabinet material while editing instead of current global defaults', (done) => {
    const persistedMaterial = {
      boxMaterial: 'PLYWOOD',
      boxBoardThickness: 21,
      boxColor: 'OAK',
      boxVeneerColor: 'OAK_EDGE',
      frontMaterial: 'MDF',
      frontBoardThickness: 19,
      frontColor: 'RAL_7016',
      frontVeneerColor: null
    };
    kitchenStateServiceStub.getCabinetById.and.returnValue({
      id: 'cab-loaded',
      materialRequest: persistedMaterial,
      varnishedFront: true
    });
    kitchenServiceSpy.calculateCabinet.and.returnValue(of({ summaryCosts: 0 } as any));

    service.calculateCabinet(
      KitchenCabinetType.BASE_ONE_DOOR,
      {
        kitchenCabinetType: KitchenCabinetType.BASE_ONE_DOOR,
        openingType: 'HANDLE',
        width: 600,
        height: 720,
        depth: 560,
        shelfQuantity: 1,
        positionY: 0
      } as CabinetFormData,
      {
        boxMaterial: 'CHIPBOARD',
        boxBoardThickness: 18,
        boxColor: 'WHITE',
        frontMaterial: 'CHIPBOARD',
        frontBoardThickness: 18,
        frontColor: 'WHITE',
        backMaterial: 'HDF',
        backBoardThickness: 3,
        varnishedFront: false
      },
      'cab-loaded'
    ).subscribe(event => {
      expect(kitchenServiceSpy.calculateCabinet).toHaveBeenCalledWith(jasmine.objectContaining({
        materialRequest: persistedMaterial,
        varnishedFront: true
      }));
      expect(event.formData.materialRequest).toEqual(persistedMaterial);
      expect(event.formData.varnishedFront).toBeTrue();
      done();
    });
  });

  it('uses explicit material override when editing a cabinet with persisted material', (done) => {
    kitchenStateServiceStub.getCabinetById.and.returnValue({
      id: 'cab-loaded',
      materialRequest: {
        boxMaterial: 'PLYWOOD',
        boxBoardThickness: 21,
        boxColor: 'OAK',
        boxVeneerColor: 'OAK_EDGE',
        frontMaterial: 'MDF',
        frontBoardThickness: 19,
        frontColor: 'RAL_7016',
        frontVeneerColor: null
      },
      varnishedFront: true
    });
    const overrideMaterial = {
      boxMaterial: 'CHIPBOARD',
      boxBoardThickness: 18,
      boxColor: 'WHITE',
      boxVeneerColor: 'WHITE',
      frontMaterial: 'CHIPBOARD',
      frontBoardThickness: 18,
      frontColor: 'BLACK',
      frontVeneerColor: 'BLACK'
    };
    kitchenServiceSpy.calculateCabinet.and.returnValue(of({ summaryCosts: 0 } as any));

    service.calculateCabinet(
      KitchenCabinetType.BASE_ONE_DOOR,
      {
        kitchenCabinetType: KitchenCabinetType.BASE_ONE_DOOR,
        openingType: 'HANDLE',
        width: 600,
        height: 720,
        depth: 560,
        shelfQuantity: 1,
        positionY: 0
      } as CabinetFormData,
      {
        boxMaterial: 'CHIPBOARD',
        boxBoardThickness: 18,
        boxColor: 'WHITE',
        frontMaterial: 'CHIPBOARD',
        frontBoardThickness: 18,
        frontColor: 'WHITE',
        backMaterial: 'HDF',
        backBoardThickness: 3,
        varnishedFront: false
      },
      'cab-loaded',
      {
        materialRequest: overrideMaterial,
        varnishedFront: false,
        materialPresetCode: 'BLACK_CONTRAST'
      }
    ).subscribe(event => {
      expect(kitchenServiceSpy.calculateCabinet).toHaveBeenCalledWith(jasmine.objectContaining({
        materialRequest: overrideMaterial,
        varnishedFront: false
      }));
      expect(event.formData.materialRequest).toEqual(overrideMaterial);
      expect(event.formData.varnishedFront).toBeFalse();
      expect(event.formData.materialPresetCode).toBe('BLACK_CONTRAST');
      done();
    });
  });

  it('uses current global defaults when persisted material preservation is disabled', (done) => {
    kitchenStateServiceStub.getCabinetById.and.returnValue({
      id: 'cab-loaded',
      materialRequest: {
        boxMaterial: 'PLYWOOD',
        boxBoardThickness: 21,
        boxColor: 'OAK',
        boxVeneerColor: 'OAK_EDGE',
        frontMaterial: 'MDF',
        frontBoardThickness: 19,
        frontColor: 'RAL_7016',
        frontVeneerColor: null
      },
      varnishedFront: true
    });
    kitchenServiceSpy.calculateCabinet.and.returnValue(of({ summaryCosts: 0 } as any));

    service.calculateCabinet(
      KitchenCabinetType.BASE_ONE_DOOR,
      {
        kitchenCabinetType: KitchenCabinetType.BASE_ONE_DOOR,
        openingType: 'HANDLE',
        width: 600,
        height: 720,
        depth: 560,
        shelfQuantity: 1,
        positionY: 0,
        useMaterialOverride: false,
        materialPresetCode: null
      } as CabinetFormData,
      {
        boxMaterial: 'CHIPBOARD',
        boxBoardThickness: 18,
        boxColor: 'WHITE',
        frontMaterial: 'CHIPBOARD',
        frontBoardThickness: 18,
        frontColor: 'WHITE',
        backMaterial: 'HDF',
        backBoardThickness: 3,
        varnishedFront: false
      },
      'cab-loaded',
      undefined,
      false
    ).subscribe(event => {
      expect(kitchenServiceSpy.calculateCabinet).toHaveBeenCalledWith(jasmine.objectContaining({
        materialRequest: {
          boxMaterial: 'CHIPBOARD',
          boxBoardThickness: 18,
          boxColor: 'WHITE',
          boxVeneerColor: 'WHITE',
          frontMaterial: 'CHIPBOARD',
          frontBoardThickness: 18,
          frontColor: 'WHITE',
          frontVeneerColor: 'WHITE'
        },
        varnishedFront: false
      }));
      expect(event.formData.materialPresetCode).toBeNull();
      expect(event.formData.varnishedFront).toBeFalse();
      done();
    });
  });

  it('propagates backend errors', (done) => {
    const backendError = new Error('backend failed');
    kitchenServiceSpy.calculateCabinet.and.returnValue(throwError(() => backendError));

    service.calculateCabinet(
      KitchenCabinetType.BASE_ONE_DOOR,
      {
        kitchenCabinetType: KitchenCabinetType.BASE_ONE_DOOR,
        openingType: 'HANDLE',
        width: 600,
        height: 720,
        depth: 560,
        shelfQuantity: 1,
        positionY: 0
      } as CabinetFormData,
      {
        boxMaterial: 'CHIPBOARD',
        boxBoardThickness: 18,
        boxColor: 'WHITE',
        frontMaterial: 'CHIPBOARD',
        frontBoardThickness: 18,
        frontColor: 'WHITE',
        backMaterial: 'HDF',
        backBoardThickness: 3,
        varnishedFront: false
      }
    ).subscribe({
      next: () => fail('expected error'),
      error: err => {
        expect(err).toBe(backendError);
        done();
      }
    });
  });

  it('attaches active wall plinth settings to PANTRY_PASSAGE preview request', (done) => {
    kitchenStateServiceStub.getPlinthConfig.and.returnValue({
      enabled: true,
      heightMm: 120,
      setbackMm: 55
    });
    kitchenServiceSpy.calculateCabinet.and.returnValue(of({ summaryCosts: 0 } as any));

    service.calculateCabinet(
      KitchenCabinetType.PANTRY_PASSAGE,
      {
        kitchenCabinetType: KitchenCabinetType.PANTRY_PASSAGE,
        openingType: 'HANDLE',
        width: 900,
        height: 2200,
        depth: 120,
        shelfQuantity: 0,
        positionY: 0
      } as CabinetFormData,
      {
        boxMaterial: 'CHIPBOARD',
        boxBoardThickness: 18,
        boxColor: 'WHITE',
        frontMaterial: 'CHIPBOARD',
        frontBoardThickness: 18,
        frontColor: 'WHITE',
        backMaterial: 'HDF',
        backBoardThickness: 3,
        varnishedFront: false
      }
    ).subscribe(() => {
      expect(kitchenServiceSpy.calculateCabinet).toHaveBeenCalledWith(jasmine.objectContaining({
        kitchenCabinetType: 'PANTRY_PASSAGE',
        attachedPlinthHeightMm: 120,
        attachedPlinthSetbackMm: 55
      }));
      done();
    });
  });

  it('sends 0/0 attached plinth when current wall has plinth disabled', (done) => {
    kitchenStateServiceStub.getPlinthConfig.and.returnValue({
      enabled: false
    });
    kitchenServiceSpy.calculateCabinet.and.returnValue(of({ summaryCosts: 0 } as any));

    service.calculateCabinet(
      KitchenCabinetType.PANTRY_PASSAGE,
      {
        kitchenCabinetType: KitchenCabinetType.PANTRY_PASSAGE,
        openingType: 'HANDLE',
        width: 900,
        height: 2200,
        depth: 120,
        shelfQuantity: 0,
        positionY: 0
      } as CabinetFormData,
      {
        boxMaterial: 'CHIPBOARD',
        boxBoardThickness: 18,
        boxColor: 'WHITE',
        frontMaterial: 'CHIPBOARD',
        frontBoardThickness: 18,
        frontColor: 'WHITE',
        backMaterial: 'HDF',
        backBoardThickness: 3,
        varnishedFront: false
      }
    ).subscribe(() => {
      expect(kitchenServiceSpy.calculateCabinet).toHaveBeenCalledWith(jasmine.objectContaining({
        kitchenCabinetType: 'PANTRY_PASSAGE',
        attachedPlinthHeightMm: 0,
        attachedPlinthSetbackMm: 0
      }));
      done();
    });
  });
});
