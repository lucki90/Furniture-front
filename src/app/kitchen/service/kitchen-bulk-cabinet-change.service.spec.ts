import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ErrorTranslationService } from '../../core/error/error-translation.service';
import { LanguageService } from '../../service/language.service';
import { TranslationService } from '../../translation/translation.service';
import { BULK_SKIP_REASONS } from '../bulk-change/bulk-cabinet-change.planner';
import { BulkCabinetChangeDialogData } from '../bulk-change/bulk-cabinet-change-dialog.component';
import { cabinetFixture, OAK_PRESET } from '../bulk-change/testing/bulk-change.fixture';
import { DEFAULT_MATERIAL_DEFAULTS } from '../cabinet-form/type-config/request-mapper/kitchen-cabinet-request-mapper';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { BulkCabinetChange, BulkChangeReport } from '../model/bulk-cabinet-change.model';
import { KitchenCabinet, WallWithCabinets } from '../model/kitchen-state.model';
import { DictionaryService } from './dictionary.service';
import { KitchenBulkCabinetChangeService } from './kitchen-bulk-cabinet-change.service';
import { KitchenStateService } from './kitchen-state.service';
import { KitchenService } from './kitchen.service';
import { MaterialPresetService } from './material-preset.service';

describe('KitchenBulkCabinetChangeService', () => {
  const calculation = {
    boards: [], components: [], jobs: [], summaryCosts: 900, boardTotalCost: 500, componentTotalCost: 200,
    jobTotalCost: 200
  };
  let kitchenService: jasmine.SpyObj<KitchenService>;
  let replaceCabinets: jasmine.Spy;
  let dialog: jasmine.SpyObj<MatDialog>;
  let service: KitchenBulkCabinetChangeService;

  const wallA = {
    id: 'wall-1', type: 'MAIN', cabinets: [
      cabinetFixture('c1', KitchenCabinetType.BASE_ONE_DOOR),
      cabinetFixture('c2', KitchenCabinetType.BASE_OPEN, { openingType: 'NONE' }),
      cabinetFixture('c4', KitchenCabinetType.BASE_TWO_DOOR, { name: 'Pod oknem' })
    ]
  } as unknown as WallWithCabinets;
  const wallB = {
    id: 'wall-2', type: 'LEFT', cabinets: [cabinetFixture('c5', KitchenCabinetType.UPPER_ONE_DOOR)]
  } as unknown as WallWithCabinets;

  beforeEach(() => {
    kitchenService = jasmine.createSpyObj<KitchenService>('KitchenService', ['calculateCabinets']);
    replaceCabinets = jasmine.createSpy('replaceCabinets');
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    TestBed.configureTestingModule({
      providers: [
        { provide: KitchenService, useValue: kitchenService },
        { provide: MatDialog, useValue: dialog },
        {
          provide: KitchenStateService,
          useValue: {
            selectedWall: signal(wallA),
            walls: signal([wallA, wallB]),
            totalCabinetCount: signal(4),
            materialDefaults: () => DEFAULT_MATERIAL_DEFAULTS,
            replaceCabinets
          }
        },
        {
          provide: ErrorTranslationService,
          useValue: { translateFieldError: (error: { code: string }) => ({ message: `PL:${error.code}`, details: [] }) }
        },
        {
          provide: DictionaryService,
          useValue: { data: signal({ openingTypes: [{ code: 'HANDLE', label: 'Uchwyt' }, { code: 'NONE', label: 'Brak' }] }) }
        },
        { provide: MaterialPresetService, useValue: { listActive: () => of([OAK_PRESET]) } },
        { provide: TranslationService, useValue: { getByCategories: () => of({ 'MATERIAL_PRESET.OAK': 'Dąb' }) } },
        { provide: LanguageService, useValue: { lang: signal('pl') } }
      ]
    });
    service = TestBed.inject(KitchenBulkCabinetChangeService);
  });

  const inset = (scope: 'WALL' | 'PROJECT'): BulkCabinetChange =>
    ({ scope, openingType: null, frontMountingType: 'INSET', material: { mode: 'KEEP' } });

  it('B2: przeliczone szafki jednym krokiem cofania; nieobsługiwane i błędne w raporcie', () => {
    kitchenService.calculateCabinets.and.returnValue(of([
      { cabinetId: 'c1', result: calculation },
      { cabinetId: 'c4', errors: [{ code: 'ex.cabinet.front.mounting.front.type.unsupported' }] }
    ]));
    let report: BulkChangeReport | undefined;

    service.apply(inset('WALL')).subscribe(value => report = value);

    const requests = kitchenService.calculateCabinets.calls.mostRecent().args[0];
    expect(requests.map(request => request.cabinetId)).toEqual(['c1', 'c4']);
    expect(requests[0].frontMountingType).toBe('INSET');
    expect(requests[0].materialRequest.boxMaterial).toBe(DEFAULT_MATERIAL_DEFAULTS.boxMaterial);

    expect(replaceCabinets).toHaveBeenCalledTimes(1);
    const replaced = replaceCabinets.calls.mostRecent().args[0] as KitchenCabinet[];
    expect(replaced.map(cabinet => cabinet.id)).toEqual(['c1']);
    expect(replaced[0].frontMountingType).toBe('INSET');
    expect(replaced[0].calculatedResult?.totalCost).toBe(900);

    expect(report?.changed).toBe(1);
    expect(report?.skipped).toEqual([
      { cabinetId: 'c2', label: 'Dolna - otwarta 600', reasons: [BULK_SKIP_REASONS.insetUnsupported] }
    ]);
    expect(report?.failed).toEqual([
      { cabinetId: 'c4', label: 'Pod oknem', reasons: ['PL:ex.cabinet.front.mounting.front.type.unsupported'] }
    ]);
  });

  it('zakres projektu obejmuje wszystkie ściany; bez zmian do zrobienia — bez wywołania backendu', () => {
    kitchenService.calculateCabinets.and.returnValue(of([]));

    service.apply(inset('PROJECT')).subscribe();
    expect(kitchenService.calculateCabinets.calls.mostRecent().args[0].map(request => request.cabinetId))
      .toEqual(['c1', 'c4', 'c5']);

    kitchenService.calculateCabinets.calls.reset();
    let report: BulkChangeReport | undefined;
    service.apply({ scope: 'WALL', openingType: 'HANDLE', frontMountingType: null, material: { mode: 'KEEP' } })
      .subscribe(value => report = value);
    expect(kitchenService.calculateCabinets).not.toHaveBeenCalled();
    expect(report?.unchanged).toBe(2);
  });

  it('okno: opcje otwierania bez „Brak”, presety materiałowe z tłumaczeniem; anulowanie bez zmian', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as never);
    let result: BulkChangeReport | null | undefined;

    service.run().subscribe(value => result = value);

    const data = dialog.open.calls.mostRecent().args[1]?.data as BulkCabinetChangeDialogData;
    expect(data.openingTypes).toEqual([{ value: 'HANDLE', label: 'Uchwyt' }]);
    expect(data.materialPresets[0].label).toBe('Dąb');
    expect(data.wallCabinetCount).toBe(3);
    expect(data.projectCabinetCount).toBe(4);
    expect(result).toBeNull();
    expect(kitchenService.calculateCabinets).not.toHaveBeenCalled();
  });
});
