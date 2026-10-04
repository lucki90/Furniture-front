import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ApiErrorHandler } from '../../core/error/api-error-handler.service';
import { ToastService } from '../../core/error/toast.service';
import { KitchenProjectDetailResponse } from '../model/kitchen-project.model';
import { KitchenProjectConflictService } from './kitchen-project-conflict.service';
import { KitchenDraftService } from './kitchen-draft.service';
import { KitchenProjectVersionsFacade } from './kitchen-project-versions.facade';
import { KitchenStateService } from './kitchen-state.service';

describe('KitchenProjectConflictService', () => {
  let dialog: jasmine.SpyObj<MatDialog>;
  let state: jasmine.SpyObj<KitchenStateService>;
  let versions: jasmine.SpyObj<KitchenProjectVersionsFacade>;
  let toast: jasmine.SpyObj<ToastService>;
  let draftService: jasmine.SpyObj<KitchenDraftService>;
  let service: KitchenProjectConflictService;

  beforeEach(() => {
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    state = jasmine.createSpyObj<KitchenStateService>('KitchenStateService', ['detachFromSavedProject'],
      { currentProjectId: signal(6).asReadonly() });
    versions = jasmine.createSpyObj<KitchenProjectVersionsFacade>('KitchenProjectVersionsFacade', ['returnToCurrent']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['info']);
    draftService = jasmine.createSpyObj<KitchenDraftService>('KitchenDraftService', ['discardCurrent']);
    TestBed.configureTestingModule({
      providers: [
        { provide: MatDialog, useValue: dialog },
        { provide: KitchenStateService, useValue: state },
        { provide: KitchenProjectVersionsFacade, useValue: versions },
        { provide: ToastService, useValue: toast },
        { provide: KitchenDraftService, useValue: draftService },
        { provide: ApiErrorHandler, useValue: jasmine.createSpyObj('ApiErrorHandler', ['handle']) }
      ]
    });
    service = TestBed.inject(KitchenProjectConflictService);
  });

  function choose(choice: string | null): void {
    dialog.open.and.returnValue({ afterClosed: () => of(choice) } as never);
  }

  it('rozpoznaje konflikt wersji tylko po 409 z kodem konfliktu', () => {
    expect(service.isVersionConflict(new HttpErrorResponse({
      status: 409, error: { code: 'ex.project.version.conflict' }
    }))).toBeTrue();
    expect(service.isVersionConflict(new HttpErrorResponse({ status: 409, error: { code: 'other' } }))).toBeFalse();
    expect(service.isVersionConflict(new HttpErrorResponse({ status: 400 }))).toBeFalse();
  });

  it('zapis jako nowy: odłącza treść od projektu i otwiera zapis', () => {
    choose('SAVE_AS_NEW');
    const saveAsNew = jasmine.createSpy('saveAsNew');

    service.handle(saveAsNew);

    expect(state.detachFromSavedProject).toHaveBeenCalled();
    expect(saveAsNew).toHaveBeenCalled();
    expect(draftService.discardCurrent).toHaveBeenCalled();
  });

  it('wczytaj najnowszą: wczytuje zapisany projekt', () => {
    choose('LOAD_LATEST');
    versions.returnToCurrent.and.returnValue(of({} as KitchenProjectDetailResponse));

    service.handle(jasmine.createSpy('saveAsNew'));

    expect(versions.returnToCurrent).toHaveBeenCalledWith(6);
    expect(toast.info).toHaveBeenCalled();
    expect(draftService.discardCurrent).toHaveBeenCalled();
  });

  it('zamknięcie okna zostawia zmiany w edytorze', () => {
    choose(null);
    const saveAsNew = jasmine.createSpy('saveAsNew');

    service.handle(saveAsNew);

    expect(saveAsNew).not.toHaveBeenCalled();
    expect(state.detachFromSavedProject).not.toHaveBeenCalled();
    expect(versions.returnToCurrent).not.toHaveBeenCalled();
    expect(draftService.discardCurrent).not.toHaveBeenCalled();
  });
});
