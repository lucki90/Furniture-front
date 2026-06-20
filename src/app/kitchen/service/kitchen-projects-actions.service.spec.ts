import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { KitchenProjectDetailResponse, KitchenProjectListResponse } from '../model/kitchen-project.model';
import { KitchenProjectTransitionGuardService } from './kitchen-project-transition-guard.service';
import { KitchenProjectsActionsService } from './kitchen-projects-actions.service';
import { KitchenService } from './kitchen.service';
import { KitchenStateService } from './kitchen-state.service';

const PROJECT: KitchenProjectListResponse = {
  id: 1,
  name: 'Test Kitchen',
  status: 'DRAFT',
  totalCost: 1000,
  wallCount: 2,
  cabinetCount: 5,
  version: 1,
  createdAt: '2026-04-28T10:00:00',
  updatedAt: '2026-04-28T10:00:00'
};

const CLONED: KitchenProjectDetailResponse = {
  id: 99,
  name: 'Kopia - Test Kitchen',
  status: 'DRAFT',
  version: 1,
  totalCost: 1000,
  totalBoardsCost: 800,
  totalComponentsCost: 100,
  totalJobsCost: 100,
  walls: [],
  createdAt: '2026-04-28T10:00:00',
  updatedAt: '2026-04-28T10:00:00'
};

describe('KitchenProjectsActionsService', () => {
  let service: KitchenProjectsActionsService;
  let kitchenService: jasmine.SpyObj<KitchenService>;
  let transitionGuard: jasmine.SpyObj<KitchenProjectTransitionGuardService>;
  let stateService: jasmine.SpyObj<KitchenStateService>;
  let router: Router;

  beforeEach(() => {
    kitchenService = jasmine.createSpyObj('KitchenService', [
      'getProjects', 'getProjectById', 'cloneProject', 'deleteProject'
    ]);
    transitionGuard = jasmine.createSpyObj('KitchenProjectTransitionGuardService', [
      'confirmUnsavedAndProceed'
    ]);
    Object.assign(transitionGuard, { isTransitioning: signal(false).asReadonly() });
    transitionGuard.confirmUnsavedAndProceed.and.callFake((_label: string, hooks: { onProceed: () => void }) => {
      hooks.onProceed();
    });

    stateService = jasmine.createSpyObj('KitchenStateService', ['loadProject', 'startNewProject', 'clearAll']);
    Object.assign(stateService, { currentProjectId: signal(null) });

    kitchenService.getProjects.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        KitchenProjectsActionsService,
        { provide: KitchenService, useValue: kitchenService },
        { provide: KitchenProjectTransitionGuardService, useValue: transitionGuard },
        { provide: KitchenStateService, useValue: stateService },
      ]
    });

    service = TestBed.inject(KitchenProjectsActionsService);
    router = TestBed.inject(Router);
  });

  describe('loadProjects', () => {
    it('ustawia projekty i wylacza loading po sukcesie', () => {
      kitchenService.getProjects.and.returnValue(of([PROJECT]));
      service.loadProjects();
      expect(service.projects()).toEqual([PROJECT]);
      expect(service.loading()).toBeFalse();
      expect(service.error()).toBeNull();
    });

    it('ustawia blad i wylacza loading po bledzie', () => {
      kitchenService.getProjects.and.returnValue(throwError(() => new Error()));
      service.loadProjects();
      expect(service.error()).toBe('Nie udało się wczytać listy projektów');
      expect(service.loading()).toBeFalse();
    });

    it('zamyka potwierdzenie usuwania, ale nie dotyka stanu klonowania', () => {
      service.cloningProjectId.set(5);
      service.deleteConfirmationProjectId.set(3);
      kitchenService.getProjects.and.returnValue(of([]));

      service.loadProjects();

      expect(service.cloningProjectId()).toBe(5);
      expect(service.deleteConfirmationProjectId()).toBeNull();
    });

    it('pomija odświeżenie podczas aktywnego requestu usuwania', () => {
      service.deletingProjectId.set(3);

      service.loadProjects();

      expect(kitchenService.getProjects).not.toHaveBeenCalled();
      expect(service.deletingProjectId()).toBe(3);
    });
  });

  describe('cloneProject', () => {
    it('po udanym klonowaniu laduje projekt i nawiguje', () => {
      kitchenService.cloneProject.and.returnValue(of(CLONED));
      const navigate = spyOn(router, 'navigate');

      service.cloneProject(1);

      expect(transitionGuard.confirmUnsavedAndProceed).toHaveBeenCalled();
      expect(kitchenService.cloneProject).toHaveBeenCalledWith(1);
      expect(stateService.loadProject).toHaveBeenCalledWith(CLONED);
      expect(navigate).toHaveBeenCalledWith(['/kitchen'], { queryParams: { projectId: 99 } });
      expect(service.cloningProjectId()).toBeNull();
    });

    it('po bledzie ustawia komunikat i czysci cloningProjectId', () => {
      kitchenService.cloneProject.and.returnValue(throwError(() => new Error('server error')));

      service.cloneProject(1);

      expect(service.error()).toBe('Nie udało się sklonować projektu');
      expect(service.cloningProjectId()).toBeNull();
    });

    it('blokuje rownolegle klonowanie gdy inne jest w toku', () => {
      service.cloningProjectId.set(2);

      service.cloneProject(1);

      expect(transitionGuard.confirmUnsavedAndProceed).not.toHaveBeenCalled();
      expect(kitchenService.cloneProject).not.toHaveBeenCalled();
    });

    it('ustawia cloningProjectId na czas trwania zadania', () => {
      let capturedId: unknown = null;
      kitchenService.cloneProject.and.callFake(() => {
        capturedId = service.cloningProjectId();
        return of(CLONED);
      });

      service.cloneProject(42);

      expect(capturedId as number).toBe(42);
      expect(service.cloningProjectId()).toBeNull();
    });

    it('czyści cloningProjectId także gdy request kończy się bez emisji', () => {
      kitchenService.cloneProject.and.returnValue(EMPTY);

      service.cloneProject(42);

      expect(service.cloningProjectId()).toBeNull();
      expect(stateService.loadProject).not.toHaveBeenCalled();
    });
  });

  describe('createNewProject', () => {
    it('przechodzi przez guard, wywoluje startNewProject i nawiguje', () => {
      const navigate = spyOn(router, 'navigate');

      service.createNewProject();

      expect(transitionGuard.confirmUnsavedAndProceed).toHaveBeenCalled();
      expect(stateService.startNewProject).toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/kitchen']);
    });
  });

  describe('deleteProject', () => {
    it('usuwa projekt z listy i czysci deletingProjectId po sukcesie', () => {
      service.projects.set([PROJECT]);
      service.deleteConfirmationProjectId.set(PROJECT.id);
      kitchenService.deleteProject.and.returnValue(of(undefined));

      service.deleteProject(PROJECT.id);

      expect(service.projects().find(p => p.id === PROJECT.id)).toBeUndefined();
      expect(service.deleteConfirmationProjectId()).toBeNull();
      expect(service.deletingProjectId()).toBeNull();
    });

    it('ustawia blad i czysci deletingProjectId po bledzie', () => {
      kitchenService.deleteProject.and.returnValue(throwError(() => new Error()));

      service.deleteProject(PROJECT.id);

      expect(service.error()).toBe('Nie udało się usunąć projektu');
      expect(service.deletingProjectId()).toBeNull();
    });

    it('nie uruchamia odświeżenia podczas trwającego requestu', () => {
      const deleteResult$ = new Subject<void>();
      kitchenService.deleteProject.and.returnValue(deleteResult$);
      kitchenService.getProjects.and.returnValue(of([PROJECT]));

      service.deleteProject(PROJECT.id);
      service.loadProjects();

      expect(service.deletingProjectId()).toBe(PROJECT.id);
      expect(kitchenService.getProjects).not.toHaveBeenCalled();

      deleteResult$.next();
      deleteResult$.complete();

      expect(service.deletingProjectId()).toBeNull();
      expect(service.projects()).toEqual([]);
    });

    it('blokuje drugi request usuwania, gdy pierwszy jest w toku', () => {
      const deleteResult$ = new Subject<void>();
      kitchenService.deleteProject.and.returnValue(deleteResult$);

      service.deleteProject(PROJECT.id);
      service.deleteProject(2);

      expect(kitchenService.deleteProject).toHaveBeenCalledTimes(1);
      expect(kitchenService.deleteProject).toHaveBeenCalledWith(PROJECT.id);

      deleteResult$.complete();
    });
  });

  describe('confirmDelete / cancelDelete', () => {
    it('ustawia i czyści identyfikator potwierdzenia', () => {
      service.confirmDelete(7);
      expect(service.deleteConfirmationProjectId()).toBe(7);
      service.cancelDelete();
      expect(service.deleteConfirmationProjectId()).toBeNull();
    });

    it('nie otwiera kolejnego potwierdzenia podczas requestu usuwania', () => {
      service.deletingProjectId.set(7);

      service.confirmDelete(8);

      expect(service.deleteConfirmationProjectId()).toBeNull();
    });
  });

  describe('openProject', () => {
    it('laduje projekt i nawiguje po sukcesie', () => {
      kitchenService.getProjectById.and.returnValue(of(CLONED));
      const navigate = spyOn(router, 'navigate');

      service.openProject(99);

      expect(transitionGuard.confirmUnsavedAndProceed).toHaveBeenCalled();
      expect(kitchenService.getProjectById).toHaveBeenCalledWith(99);
      expect(stateService.loadProject).toHaveBeenCalledWith(CLONED);
      expect(navigate).toHaveBeenCalledWith(['/kitchen'], { queryParams: { projectId: 99 } });
      expect(service.loading()).toBeFalse();
    });

    it('ustawia blad po bledzie ladowania', () => {
      kitchenService.getProjectById.and.returnValue(throwError(() => new Error()));

      service.openProject(99);

      expect(service.error()).toBe('Nie udało się wczytać projektu');
      expect(service.loading()).toBeFalse();
    });
  });
});
