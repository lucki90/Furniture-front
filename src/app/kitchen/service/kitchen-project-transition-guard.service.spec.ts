import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ApiErrorHandler } from '../../core/error/api-error-handler.service';
import { ToastService } from '../../core/error/toast.service';
import { SaveProjectDialogResult } from '../save-project-dialog/save-project-dialog.component';
import { KitchenProjectTransitionGuardService } from './kitchen-project-transition-guard.service';
import { KitchenProjectWorkflowFacade } from './kitchen-project-workflow.facade';
import { KitchenStateService } from './kitchen-state.service';

describe('KitchenProjectTransitionGuardService', () => {
  let service: KitchenProjectTransitionGuardService;
  let dialog: jasmine.SpyObj<MatDialog>;
  let stateService: jasmine.SpyObj<KitchenStateService>;
  let workflowFacade: jasmine.SpyObj<KitchenProjectWorkflowFacade>;
  let toast: jasmine.SpyObj<ToastService>;

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

    TestBed.configureTestingModule({
      providers: [
        KitchenProjectTransitionGuardService,
        { provide: MatDialog, useValue: dialog },
        { provide: KitchenStateService, useValue: stateService },
        { provide: KitchenProjectWorkflowFacade, useValue: workflowFacade },
        { provide: ToastService, useValue: toast },
        { provide: ApiErrorHandler, useValue: jasmine.createSpyObj('ApiErrorHandler', ['handle']) }
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
  });

  it('proceeds after discard decision from unsaved dialog', () => {
    stateService.hasUnsavedChanges.and.returnValue(true);
    dialog.open.and.returnValue({
      afterClosed: () => of('discard')
    } as MatDialogRef<unknown>);
    const onProceed = jasmine.createSpy('onProceed');

    service.confirmUnsavedAndProceed('otwórz inny projekt', { onProceed });

    expect(onProceed).toHaveBeenCalled();
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
  });
});
