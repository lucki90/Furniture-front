import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ApiErrorHandler } from '../../core/error/api-error-handler.service';
import { ToastService } from '../../core/error/toast.service';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { drawersPresetFixture } from '../cabinet-presets/testing/cabinet-preset.fixture';
import { DEFAULT_MATERIAL_DEFAULTS } from '../cabinet-form/type-config/request-mapper/kitchen-cabinet-request-mapper';
import { CabinetCalculatedEvent, CabinetFormData, KitchenCabinet } from '../model/kitchen-state.model';
import { CabinetPresetService } from './cabinet-preset.service';
import { defaultCabinetPresetName, KitchenCabinetPresetsFacade } from './kitchen-cabinet-presets.facade';
import { KitchenStateService } from './kitchen-state.service';

describe('KitchenCabinetPresetsFacade', () => {
  let dialog: jasmine.SpyObj<MatDialog>;
  let presetService: jasmine.SpyObj<CabinetPresetService>;
  let toast: jasmine.SpyObj<ToastService>;
  let facade: KitchenCabinetPresetsFacade;
  const cabinet = {
    id: 'cabinet-2', type: KitchenCabinetType.BASE_ONE_DOOR, name: '', openingType: 'HANDLE',
    width: 500, height: 720, depth: 500, positionY: 0, shelfQuantity: 1, gapBeforeMm: 30
  } as KitchenCabinet;

  beforeEach(() => {
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    presetService = jasmine.createSpyObj<CabinetPresetService>('CabinetPresetService', ['create']);
    presetService.create.and.returnValue(of(drawersPresetFixture({ id: 40, system: false })));
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success']);
    TestBed.configureTestingModule({
      providers: [
        { provide: MatDialog, useValue: dialog },
        { provide: CabinetPresetService, useValue: presetService },
        { provide: ToastService, useValue: toast },
        { provide: ApiErrorHandler, useValue: jasmine.createSpyObj('ApiErrorHandler', ['handle']) },
        {
          provide: KitchenStateService,
          useValue: {
            getCabinetById: (id: string) => id === cabinet.id ? cabinet : undefined,
            materialDefaults: () => DEFAULT_MATERIAL_DEFAULTS
          }
        }
      ]
    });
    facade = TestBed.inject(KitchenCabinetPresetsFacade);
  });

  function answer(name: string | undefined): void {
    dialog.open.and.returnValue({ afterClosed: () => of(name) } as never);
  }

  it('zapis szafki z listy: domyślna nazwa z typu i szerokości, konfiguracja bez pozycji', () => {
    answer('Wąska 500');

    facade.saveCabinet('cabinet-2');

    expect((dialog.open.calls.mostRecent().args[1]?.data as { name: string }).name).toBe('Dolna - 1 drzwi 500');
    const [name, request] = presetService.create.calls.mostRecent().args;
    expect(name).toBe('Wąska 500');
    expect(request.kitchenCabinetType).toBe(KitchenCabinetType.BASE_ONE_DOOR);
    expect(request.width).toBe(500);
    expect(request.positionX).toBe(0);
    expect(toast.success).toHaveBeenCalledWith('Zapisano preset „Wąska 500”');
  });

  it('anulowanie okna nie zapisuje presetu; nieznana szafka nie otwiera okna', () => {
    answer(undefined);
    facade.saveCabinet('cabinet-2');
    facade.saveCabinet('brak');

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(presetService.create).not.toHaveBeenCalled();
  });

  it('zapis z formularza buduje szafkę z danych formularza i wyniku kalkulacji', () => {
    answer('Z formularza');
    const event: CabinetCalculatedEvent = {
      formData: {
        kitchenCabinetType: KitchenCabinetType.BASE_ONE_DOOR, openingType: 'HANDLE', width: 450, height: 720,
        depth: 500, positionY: 0, shelfQuantity: 2
      } as CabinetFormData,
      result: { boards: [], components: [], jobs: [], summaryCosts: 0, boardTotalCost: 0, componentTotalCost: 0,
        jobTotalCost: 0 }
    };

    facade.saveCalculated(event);

    const request = presetService.create.calls.mostRecent().args[1];
    expect(request.width).toBe(450);
    expect(request.shelfQuantity).toBe(2);
  });

  it('nazwa szafki ma pierwszeństwo przed typem', () => {
    expect(defaultCabinetPresetName({ ...cabinet, name: ' Przy oknie ' })).toBe('Przy oknie');
  });
});
