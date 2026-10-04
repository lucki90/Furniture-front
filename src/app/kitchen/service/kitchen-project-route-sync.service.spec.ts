import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ApiErrorHandler } from '../../core/error/api-error-handler.service';
import { ToastService } from '../../core/error/toast.service';
import { KitchenProjectDetailResponse } from '../model/kitchen-project.model';
import {
  KitchenProjectRouteHooks,
  KitchenProjectRouteSyncService,
  parseProjectIdParam
} from './kitchen-project-route-sync.service';
import {
  KitchenProjectTransitionGuardService,
  KitchenProjectTransitionHooks
} from './kitchen-project-transition-guard.service';
import { KitchenService } from './kitchen.service';
import { KitchenStateService } from './kitchen-state.service';

class KitchenStateStub {
  readonly currentProjectId = signal<number | null>(null);
  readonly loadProject = jasmine.createSpy('loadProject').and.callFake(
    (project: KitchenProjectDetailResponse) => this.currentProjectId.set(project.id)
  );
  readonly startNewProject = jasmine.createSpy('startNewProject').and.callFake(
    () => this.currentProjectId.set(null)
  );
}

function project(id: number): KitchenProjectDetailResponse {
  return { id, name: `Projekt ${id}` } as KitchenProjectDetailResponse;
}

describe('parseProjectIdParam', () => {
  it('przyjmuje dodatnią liczbę całkowitą', () => {
    expect(parseProjectIdParam('12')).toBe(12);
  });

  it('odrzuca wartości, które nie są identyfikatorem projektu', () => {
    for (const value of ['', '0', '-3', '1.5', '12abc', 'abc', ' 12', '99999999999999999999']) {
      expect(parseProjectIdParam(value)).withContext(value).toBeNull();
    }
  });
});

describe('KitchenProjectRouteSyncService', () => {
  let service: KitchenProjectRouteSyncService;
  let queryParams$: BehaviorSubject<ParamMap>;
  let state: KitchenStateStub;
  let kitchenService: jasmine.SpyObj<KitchenService>;
  let guard: jasmine.SpyObj<KitchenProjectTransitionGuardService>;
  let router: jasmine.SpyObj<Router>;
  let errorHandler: jasmine.SpyObj<ApiErrorHandler>;
  let toast: jasmine.SpyObj<ToastService>;
  let hooks: jasmine.SpyObj<KitchenProjectRouteHooks>;
  let route: ActivatedRoute;

  beforeEach(() => {
    queryParams$ = new BehaviorSubject<ParamMap>(convertToParamMap({}));
    route = { queryParamMap: queryParams$.asObservable() } as ActivatedRoute;
    state = new KitchenStateStub();
    kitchenService = jasmine.createSpyObj<KitchenService>('KitchenService', ['getProjectById']);
    guard = jasmine.createSpyObj<KitchenProjectTransitionGuardService>('KitchenProjectTransitionGuardService', [
      'confirmUnsavedAndProceed'
    ]);
    guard.confirmUnsavedAndProceed.and.callFake((_label, transitionHooks) => transitionHooks.onProceed());
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    errorHandler = jasmine.createSpyObj<ApiErrorHandler>('ApiErrorHandler', ['handle']);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);
    hooks = jasmine.createSpyObj<KitchenProjectRouteHooks>('KitchenProjectRouteHooks', ['onWorkspaceReplaced']);

    TestBed.configureTestingModule({
      providers: [
        KitchenProjectRouteSyncService,
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router },
        { provide: KitchenStateService, useValue: state },
        { provide: KitchenService, useValue: kitchenService },
        { provide: KitchenProjectTransitionGuardService, useValue: guard },
        { provide: ApiErrorHandler, useValue: errorHandler },
        { provide: ToastService, useValue: toast }
      ]
    });
    service = TestBed.inject(KitchenProjectRouteSyncService);
  });

  function enterWithProjectId(projectId: string | null): void {
    queryParams$.next(convertToParamMap(projectId === null ? {} : { projectId }));
  }

  function expectUrlSyncedTo(projectId: number | null): void {
    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: route,
      queryParams: { projectId },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  it('wczytuje projekt wskazany w adresie tą samą ścieżką co „Otwórz” i czyści widok strony', () => {
    const response$ = new Subject<KitchenProjectDetailResponse>();
    kitchenService.getProjectById.and.returnValue(response$);
    service.connect(hooks);

    enterWithProjectId('12');

    expect(guard.confirmUnsavedAndProceed).toHaveBeenCalledOnceWith('otwórz projekt z adresu strony', jasmine.any(Object));
    expect(kitchenService.getProjectById).toHaveBeenCalledOnceWith(12);
    expect(service.loadingProjectId()).toBe(12);

    response$.next(project(12));
    response$.complete();

    expect(state.loadProject).toHaveBeenCalledOnceWith(project(12));
    expect(hooks.onWorkspaceReplaced).toHaveBeenCalledTimes(1);
    expect(service.loadingProjectId()).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('nie wczytuje ponownie projektu, który jest już otwarty (po „Otwórz” albo klonowaniu)', () => {
    state.currentProjectId.set(12);
    service.connect(hooks);

    enterWithProjectId('12');

    expect(guard.confirmUnsavedAndProceed).not.toHaveBeenCalled();
    expect(kitchenService.getProjectById).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('nie robi nic, gdy adres nie wskazuje projektu', () => {
    state.currentProjectId.set(5);
    service.connect(hooks);

    enterWithProjectId(null);

    expect(guard.confirmUnsavedAndProceed).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('gdy projekt nie istnieje albo jest cudzy, pokazuje błąd, czyści stan i usuwa projectId z adresu', () => {
    const notFound = { status: 400, error: { code: 'ex.project.not.found' } };
    kitchenService.getProjectById.and.returnValue(throwError(() => notFound));
    spyOn(console, 'error');
    service.connect(hooks);

    enterWithProjectId('404');

    expect(errorHandler.handle).toHaveBeenCalledOnceWith(notFound);
    expect(state.loadProject).not.toHaveBeenCalled();
    expect(state.startNewProject).toHaveBeenCalledTimes(1);
    expect(hooks.onWorkspaceReplaced).toHaveBeenCalledTimes(1);
    expectUrlSyncedTo(null);
    expect(service.loadingProjectId()).toBeNull();
  });

  it('przy wygasłej sesji zostawia nawigację interceptorowi', () => {
    kitchenService.getProjectById.and.returnValue(throwError(() => ({ status: 401 })));
    service.connect(hooks);

    enterWithProjectId('12');

    expect(errorHandler.handle).not.toHaveBeenCalled();
    expect(state.startNewProject).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('czeka na decyzję o niezapisanych zmianach i po anulowaniu przywraca adres otwartego projektu', () => {
    let transitionHooks: KitchenProjectTransitionHooks | undefined;
    guard.confirmUnsavedAndProceed.and.callFake((_label, value) => { transitionHooks = value; });
    state.currentProjectId.set(7);
    service.connect(hooks);

    enterWithProjectId('12');

    expect(kitchenService.getProjectById).not.toHaveBeenCalled();

    transitionHooks!.onAbort!();

    expect(kitchenService.getProjectById).not.toHaveBeenCalled();
    expect(state.loadProject).not.toHaveBeenCalled();
    expectUrlSyncedTo(7);
  });

  it('wczytuje projekt dopiero po potwierdzeniu porzucenia albo zapisu zmian', () => {
    let transitionHooks: KitchenProjectTransitionHooks | undefined;
    guard.confirmUnsavedAndProceed.and.callFake((_label, value) => { transitionHooks = value; });
    kitchenService.getProjectById.and.returnValue(of(project(12)));
    service.connect(hooks);

    enterWithProjectId('12');
    transitionHooks!.onProceed();

    expect(state.loadProject).toHaveBeenCalledOnceWith(project(12));
  });

  it('pomija nieaktualną decyzję, gdy adres zmienił się w trakcie przejścia', () => {
    const transitions: KitchenProjectTransitionHooks[] = [];
    guard.confirmUnsavedAndProceed.and.callFake((_label, value) => { transitions.push(value); });
    service.connect(hooks);

    enterWithProjectId('12');
    enterWithProjectId('13');
    transitions[0].onProceed();
    transitions[0].onAbort!();

    expect(kitchenService.getProjectById).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('przerywa wczytywanie, gdy adres wskaże inny projekt przed odpowiedzią', () => {
    const first$ = new Subject<KitchenProjectDetailResponse>();
    kitchenService.getProjectById.and.returnValues(first$, of(project(13)));
    service.connect(hooks);

    enterWithProjectId('12');
    enterWithProjectId('13');
    first$.next(project(12));

    expect(state.loadProject).toHaveBeenCalledOnceWith(project(13));
    expect(state.currentProjectId()).toBe(13);
  });

  it('synchronizuje adres z projektem zmienionym bez nawigacji (zapis nowego projektu, wyczyszczenie)', () => {
    state.currentProjectId.set(21);
    service.syncUrlWithOpenProject();
    expectUrlSyncedTo(21);

    state.currentProjectId.set(null);
    service.syncUrlWithOpenProject();
    expectUrlSyncedTo(null);
  });

  it('nieprawidłowy identyfikator w adresie daje komunikat i adres otwartego projektu', () => {
    state.currentProjectId.set(7);
    service.connect(hooks);

    enterWithProjectId('abc');

    expect(toast.error).toHaveBeenCalledOnceWith('Adres strony zawiera nieprawidłowy identyfikator projektu.');
    expect(guard.confirmUnsavedAndProceed).not.toHaveBeenCalled();
    expectUrlSyncedTo(7);
  });
});
