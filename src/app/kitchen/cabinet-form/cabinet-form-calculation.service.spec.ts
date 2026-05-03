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
  };

  beforeEach(() => {
    kitchenServiceSpy = jasmine.createSpyObj<KitchenService>('KitchenService', ['calculateCabinet']);
    kitchenStateServiceStub = {
      getPlinthConfig: jasmine.createSpy('getPlinthConfig').and.returnValue(undefined),
      selectedWall: jasmine.createSpy('selectedWall').and.returnValue({ id: 'wall-1', type: 'MAIN' }),
      plinthHeightMm: jasmine.createSpy('plinthHeightMm').and.returnValue(100),
      plinthSetbackMm: jasmine.createSpy('plinthSetbackMm').and.returnValue(40)
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
          formData,
          result: response,
          editingCabinetId: 'cab-1'
        });
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
