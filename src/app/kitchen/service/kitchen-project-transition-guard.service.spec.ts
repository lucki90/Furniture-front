import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { ApiErrorHandler } from '../../core/error/api-error-handler.service';
import { ToastService } from '../../core/error/toast.service';
import { SaveProjectDialogResult } from '../save-project-dialog/save-project-dialog.component';
import { UnsavedChangesDecision } from '../unsaved-changes-dialog/unsaved-changes-dialog.component';
import { KitchenProjectTransitionGuardService } from './kitchen-project-transition-guard.service';
import { KitchenProjectWorkflowFacade } from './kitchen-project-workflow.facade';
import { KitchenStateService } from './kitchen-state.service';

describe('KitchenProjectTransitionGuardService', () => {
  let service: KitchenProjectTransitionGuardService;
  let dialog: jasmine.SpyObj<MatDialog>;
  let stateService: jasmine.SpyObj<KitchenStateService>;
  let workflowFacade: jasmine.SpyObj<KitchenProjectWorkflowFacade>;
  let toast: jasmine.SpyObj<ToastService>;
  let errorHandler: jasmine.SpyObj<ApiErrorHandler>;

  beforeEach(() => {
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    stateService = jasmine.createSpyObj<KitchenStateService>('KitchenStateService', [
      'hasUnsavedChanges',
      'currentProjectId',
      'currentProjectName',
      'currentProjectDescription',
      'currentProjectClientName',
      'currentProjectClientPhone',
      'currentProjectClientEmail',
      'buildMultiWallProjectRequest',
      'buildUpdateProjectRequest',
      'setProjectInfo',
      'markProjectAsClean'
    ]);
    workflowFacade = jasmine.createSpyObj<KitchenProjectWorkflowFacade>('KitchenProjectWorkflowFacade', ['saveProject']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'info']);
    errorHandler = jasmine.createSpyObj<ApiErrorHandler>('ApiErrorHandler', ['handle']);
    stateService.currentProjectId.and.returnValue(null);
    stateService.currentProjectName.and.returnValue('');
    stateService.currentProjectDescription.and.returnValue('');
    stateService.currentProjectClientName.and.returnValue('');
    stateService.currentProjectClientPhone.and.returnValue('');
    stateService.currentProjectClientEmail.and.returnValue('');

    TestBed.configureTestingModule({
      providers: [
        KitchenProjectTransitionGuardService,
        { provide: MatDialog, useValue: dialog },
        { provide: KitchenStateService, useValue: stateService },
        { provide: KitchenProjectWorkflowFacade, useValue: workflowFacade },
        { provide: ToastService, useValue: toast },
        { provide: ApiErrorHandler, useValue: errorHandler }
      ]
    });

    service = TestBed.inject(KitchenProjectTransitionGuardService);
  });

  it('proceeds immediately when there are no unsaved changes', () => {
    stateService.hasUnsavedChanges.and.returnValue(false);
    const onProceed = jasmine.createSpy('onProceed');

    service.confirmUnsavedAndProceed('otwórz inny projekt', { onProceed });

    expect(onProceed).toHaveBeenCalled();
    expect(dialog.open).not.toHaveBeenCalled();
    expect(service.isTransitioning()).toBeFalse();
  });

  it('proceeds after discard decision from unsaved dialog', () => {
    stateService.hasUnsavedChanges.and.returnValue(true);
    dialog.open.and.returnValue({
      afterClosed: () => of('discard')
    } as MatDialogRef<unknown>);
    const onProceed = jasmine.createSpy('onProceed');

    service.confirmUnsavedAndProceed('otwórz inny projekt', { onProceed });

    expect(onProceed).toHaveBeenCalled();
    expect(service.isTransitioning()).toBeFalse();
  });

  it('saves current project and proceeds after save decision', () => {
    const saveDialogResult: SaveProjectDialogResult = {
      name: 'Projekt testowy',
      description: 'Opis',
      clientName: 'Jan',
      clientPhone: '123',
      clientEmail: 'jan@example.com'
    };

    stateService.hasUnsavedChanges.and.returnValue(true);
    stateService.currentProjectId.and.returnValue(7);
    stateService.currentProjectName.and.returnValue('Projekt testowy');
    stateService.currentProjectDescription.and.returnValue('Opis');
    stateService.currentProjectClientName.and.returnValue('Jan');
    stateService.currentProjectClientPhone.and.returnValue('123');
    stateService.currentProjectClientEmail.and.returnValue('jan@example.com');
    stateService.buildUpdateProjectRequest.and.returnValue({ name: 'Projekt testowy', walls: [] } as never);

    dialog.open.and.returnValues(
      { afterClosed: () => of('save') } as MatDialogRef<unknown>,
      { afterClosed: () => of(saveDialogResult) } as MatDialogRef<unknown>
    );

    workflowFacade.saveProject.and.returnValue(of({
      response: {} as never,
      projectInfo: {
        id: 7,
        name: 'Projekt testowy',
        version: 2,
        description: 'Opis',
        status: 'DRAFT',
        allowedTransitions: ['OFFER_SENT'],
        clientName: 'Jan',
        clientPhone: '123',
        clientEmail: 'jan@example.com'
      },
      successMessage: 'Projekt został zaktualizowany'
    }));

    const onProceed = jasmine.createSpy('onProceed');

    service.confirmUnsavedAndProceed('otwórz inny projekt', { onProceed });

    expect(workflowFacade.saveProject).toHaveBeenCalled();
    expect(stateService.setProjectInfo).toHaveBeenCalled();
    expect(stateService.markProjectAsClean).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Projekt został zaktualizowany');
    expect(onProceed).toHaveBeenCalled();
    expect(service.isTransitioning()).toBeFalse();
  });

  it('blocks a second entry point while the unsaved-changes dialog is open', () => {
    const decision$ = new Subject<UnsavedChangesDecision | undefined>();
    stateService.hasUnsavedChanges.and.returnValue(true);
    dialog.open.and.returnValue({
      afterClosed: () => decision$.asObservable()
    } as MatDialogRef<unknown>);
    const firstProceed = jasmine.createSpy('firstProceed');
    const secondProceed = jasmine.createSpy('secondProceed');

    service.confirmUnsavedAndProceed('otwórz projekt', { onProceed: firstProceed });
    service.confirmUnsavedAndProceed('utwórz projekt', { onProceed: secondProceed });

    expect(service.isTransitioning()).toBeTrue();
    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(secondProceed).not.toHaveBeenCalled();

    decision$.next(undefined);
    decision$.complete();

    expect(service.isTransitioning()).toBeFalse();
    expect(firstProceed).not.toHaveBeenCalled();
  });

  it('releases the lock when the save dialog is canceled', () => {
    stateService.hasUnsavedChanges.and.returnValue(true);
    dialog.open.and.returnValues(
      { afterClosed: () => of('save') } as MatDialogRef<unknown>,
      { afterClosed: () => of(undefined) } as MatDialogRef<unknown>
    );
    const onProceed = jasmine.createSpy('onProceed');
    const onSaveDialogCanceled = jasmine.createSpy('onSaveDialogCanceled');

    service.confirmUnsavedAndProceed('otwórz projekt', { onProceed, onSaveDialogCanceled });

    expect(service.isTransitioning()).toBeFalse();
    expect(onSaveDialogCanceled).toHaveBeenCalled();
    expect(onProceed).not.toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith('Anulowano zapis - projekt nie został przełączony.');
  });

  it('releases the lock and reports an error when saving fails', () => {
    const saveResult: SaveProjectDialogResult = {
      name: 'Nowy projekt',
      description: '',
      clientName: '',
      clientPhone: '',
      clientEmail: ''
    };
    const backendError = new Error('save failed');
    const savingChanges: boolean[] = [];
    stateService.buildMultiWallProjectRequest.and.returnValue({ name: 'Nowy projekt', walls: [] } as never);
    dialog.open.and.returnValue({
      afterClosed: () => of(saveResult)
    } as MatDialogRef<unknown>);
    workflowFacade.saveProject.and.returnValue(throwError(() => backendError));

    service.openSaveProjectDialogAndPersist({
      onSavingChange: value => savingChanges.push(value)
    });

    expect(savingChanges).toEqual([true, false]);
    expect(errorHandler.handle).toHaveBeenCalledWith(backendError);
    expect(service.isTransitioning()).toBeFalse();
  });

  it('blocks opening a second save dialog until the first dialog closes', () => {
    const result$ = new Subject<SaveProjectDialogResult | undefined>();
    dialog.open.and.returnValue({
      afterClosed: () => result$.asObservable()
    } as MatDialogRef<unknown>);

    service.openSaveProjectDialogAndPersist();
    service.openSaveProjectDialogAndPersist();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(service.isTransitioning()).toBeTrue();

    result$.next(undefined);
    result$.complete();

    expect(service.isTransitioning()).toBeFalse();
  });

  it('releases the lock when the save stream completes without a response', () => {
    const saveResult: SaveProjectDialogResult = {
      name: 'Nowy projekt',
      description: '',
      clientName: '',
      clientPhone: '',
      clientEmail: ''
    };
    const savingChanges: boolean[] = [];
    stateService.buildMultiWallProjectRequest.and.returnValue({ name: 'Nowy projekt', walls: [] } as never);
    dialog.open.and.returnValue({
      afterClosed: () => of(saveResult)
    } as MatDialogRef<unknown>);
    workflowFacade.saveProject.and.returnValue(EMPTY);

    service.openSaveProjectDialogAndPersist({
      onSavingChange: value => savingChanges.push(value)
    });

    expect(savingChanges).toEqual([true, false]);
    expect(service.isTransitioning()).toBeFalse();
  });
});
