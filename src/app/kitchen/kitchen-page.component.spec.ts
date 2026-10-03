import { signal, computed } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { MatDialogModule } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { KitchenPageComponent } from './kitchen-page.component';
import { KitchenStateService } from './service/kitchen-state.service';
import { KitchenProjectPricingFacade } from './service/kitchen-project-pricing.facade';
import { KitchenProjectWorkflowFacade } from './service/kitchen-project-workflow.facade';
import { KitchenProjectExportFacade } from './service/kitchen-project-export.facade';
import { KitchenProjectStatusFacade } from './service/kitchen-project-status.facade';
import { KitchenWorkspaceActionsFacade } from './service/kitchen-workspace-actions.facade';
import { KitchenService } from './service/kitchen.service';
import { ToastService } from '../core/error/toast.service';
import { ApiErrorHandler } from '../core/error/api-error-handler.service';
import { KitchenBomTranslationsService } from './service/kitchen-bom-translations.service';
import { LanguageService } from '../service/language.service';
import { KitchenProjectTransitionGuardService } from './service/kitchen-project-transition-guard.service';
import { KitchenPagePricingService } from './service/kitchen-page-pricing.service';
import { KitchenProjectRequestsFacade } from './service/kitchen-project-requests.facade';
import { EMPTY, of, Subject, throwError } from 'rxjs';
import { DEFAULT_GRAIN_DIRECTIONS, GrainDirections, NO_GRAIN_OVERRIDE } from '../shared/model/grain-direction';
import { KitchenProjectDetailResponse } from './model/kitchen-project.model';
import { KitchenProjectTransitionHooks } from './service/kitchen-project-transition-guard.service';

// Stub dostarcza wszystkie sygnały konsumowane przez KitchenPageComponent.
class KitchenStateServiceStub {
  readonly walls = signal<any[]>([]);
  readonly selectedWall = signal<any>({ id: 'w1', type: 'MAIN', widthMm: 3000, heightMm: 2600, cabinets: [], plinthConfig: null, countertopConfig: null });
  readonly selectedWallId = signal<string | null>('w1');
  readonly currentProjectId = signal<number | null>(null);
  readonly currentProjectName = signal('');
  readonly currentProjectDescription = signal<string | null>(null);
  readonly currentProjectVersion = signal(1);
  readonly currentProjectStatus = signal<any>('DRAFT');
  readonly currentProjectAllowedTransitions = signal<any[]>([]);
  readonly currentProjectRoomWidthMm = signal<number | null>(null);
  readonly currentProjectRoomDepthMm = signal<number | null>(null);
  readonly currentProjectGrainDirections = signal<GrainDirections>(NO_GRAIN_OVERRIDE);
  readonly userGrainDirections = signal(DEFAULT_GRAIN_DIRECTIONS);
  readonly cabinets = signal<any[]>([]);
  readonly totalCost = signal(0);
  readonly selectedWallTotalCost = signal(0);
  readonly totalWidth = signal(0);
  readonly fitsOnWall = signal(true);
  readonly remainingWidth = signal(0);
  readonly totalCabinetCount = signal(0);
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);
  readonly visibleIslandSide = signal<any>('FRONT');
  readonly showCountertop = signal(true);
  readonly showUpperCabinets = signal(true);
  readonly plinthHeightMm = signal(100);
  readonly countertopThicknessMm = signal(38);
  readonly upperFillerHeightMm = signal(100);
  readonly fillerWidthMm = signal(50);
  readonly cabinetPositions = signal<any[]>([]);
  readonly usedWidthBottom = signal(0);
  readonly usedWidthTop = signal(0);
  readonly remainingWidthBottom = signal(0);
  readonly remainingWidthTop = signal(0);
  readonly wall = computed(() => ({ length: 3000, height: 2600 }));

  getWallLabel = () => 'Sciana glowna';
  getPlinthConfig = () => null;
  getCountertopConfig = () => null;
  updateProjectSettings = () => {};
  updateProjectGrainDirections = (value: GrainDirections, _options?: { recordHistory?: boolean }) => {
    this.currentProjectGrainDirections.set(value);
  };
  undo = () => false;
  redo = () => false;
  loadProject = (project: KitchenProjectDetailResponse) => this.currentProjectId.set(project.id);
  startNewProject = () => this.currentProjectId.set(null);
}

/**
 * Testy skupione wyłącznie na logice klawiszowej onKeyDown.
 * Komponent jest tworzony bez renderowania template (bez detectChanges),
 * co eliminuje zależności sub-komponentów i pozwala testować handler bezpośrednio.
 */
describe('KitchenPageComponent — keyboard shortcuts', () => {
  let component: KitchenPageComponent;
  let fixture: ComponentFixture<KitchenPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        KitchenPageComponent,
        RouterModule.forRoot([]),
        MatDialogModule
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: KitchenStateService, useClass: KitchenStateServiceStub },
        { provide: KitchenProjectPricingFacade, useValue: { loadPricing: () => EMPTY, savePricing: () => EMPTY } },
        { provide: KitchenProjectWorkflowFacade, useValue: { calculateProject: () => EMPTY } },
        { provide: KitchenProjectExportFacade, useValue: { exportExcel: () => EMPTY, downloadOfferPdf: () => EMPTY, getBomPriceWarning: () => null } },
        { provide: KitchenProjectStatusFacade, useValue: { changeStatus: () => EMPTY } },
        {
          provide: KitchenWorkspaceActionsFacade,
          useValue: { confirmAndRemoveWall: () => of(false), confirmAndClearAll: () => of(false), confirmAndClearSelectedWallCabinets: () => of(false) }
        },
        { provide: KitchenService, useValue: { getProjectById: () => EMPTY } },
        { provide: ToastService, useValue: { success: () => {}, error: () => {}, warning: () => {} } },
        { provide: ApiErrorHandler, useValue: { handle: () => {} } },
        { provide: KitchenBomTranslationsService, useValue: { watchTranslations: () => EMPTY } },
        { provide: LanguageService, useValue: { lang: signal('pl') } },
        {
          provide: KitchenProjectTransitionGuardService,
          useValue: {
            openSaveProjectDialogAndPersist: jasmine.createSpy('openSaveProjectDialogAndPersist'),
            confirmUnsavedAndProceed: () => {},
            isTransitioning: signal(false).asReadonly()
          }
        },
        { provide: KitchenProjectRequestsFacade, useValue: { buildMultiWallCalculateRequest: () => ({ walls: [] }) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KitchenPageComponent);
    component = fixture.componentInstance;
    // Celowo NIE wywołujemy fixture.detectChanges() — test sprawdza wyłącznie metody
    // onKeyDown/onSaveProject/undo/redo, nie renderowanie template.
  });

  // Pomocnicza funkcja wywołująca onKeyDown bezpośrednio (bez dispatchEvent),
  // co jest szybsze i nie wymaga wiring HostListenera.
  function sendKey(key: string, opts: { ctrlKey?: boolean; shiftKey?: boolean; target?: Element } = {}): void {
    const target = opts.target ?? document.body;
    const event = new KeyboardEvent('keydown', {
      key,
      ctrlKey: opts.ctrlKey ?? false,
      shiftKey: opts.shiftKey ?? false,
      bubbles: true,
      cancelable: true
    });
    Object.defineProperty(event, 'target', { value: target });
    component.onKeyDown(event);
  }

  describe('Ctrl+S', () => {
    it('calls onSaveProject when Ctrl+S is pressed and not saving', () => {
      const spy = spyOn(component, 'onSaveProject');
      component.isSavingProject.set(false);

      sendKey('s', { ctrlKey: true });

      expect(spy).toHaveBeenCalledOnceWith();
    });

    it('does not call onSaveProject when already saving', () => {
      const spy = spyOn(component, 'onSaveProject');
      component.isSavingProject.set(true);

      sendKey('s', { ctrlKey: true });

      expect(spy).not.toHaveBeenCalled();
    });

    it('does not call onSaveProject when focus is inside an INPUT', () => {
      const spy = spyOn(component, 'onSaveProject');
      const input = document.createElement('input');

      sendKey('s', { ctrlKey: true, target: input });

      expect(spy).not.toHaveBeenCalled();
    });

    it('does not fire without Ctrl/Meta modifier', () => {
      const spy = spyOn(component, 'onSaveProject');

      sendKey('s');   // brak ctrlKey

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Ctrl+Z / Ctrl+Y — undo/redo regression', () => {
    it('calls undo on Ctrl+Z', () => {
      const spy = spyOn(component, 'undo');
      sendKey('z', { ctrlKey: true });
      expect(spy).toHaveBeenCalled();
    });

    it('calls redo on Ctrl+Shift+Z', () => {
      const spy = spyOn(component, 'redo');
      sendKey('z', { ctrlKey: true, shiftKey: true });
      expect(spy).toHaveBeenCalled();
    });

    it('calls redo on Ctrl+Y', () => {
      const spy = spyOn(component, 'redo');
      sendKey('y', { ctrlKey: true });
      expect(spy).toHaveBeenCalled();
    });
  });

  it('tworzy osobną instancję serwisu wyceny dla każdej strony kuchni', () => {
    const firstService = fixture.debugElement.injector.get(KitchenPagePricingService);
    const secondFixture = TestBed.createComponent(KitchenPageComponent);
    const secondService = secondFixture.debugElement.injector.get(KitchenPagePricingService);

    expect(secondService).not.toBe(firstService);

    secondFixture.destroy();
  });

  it('przekazuje nadpisanie kierunku słoja do stanu projektu z historią', () => {
    const state = TestBed.inject(KitchenStateService) as unknown as KitchenStateServiceStub;
    const updateSpy = spyOn(state, 'updateProjectGrainDirections').and.callThrough();
    const override: GrainDirections = { front: 'ALONG_WIDTH', side: null, panel: 'ANY' };

    component.onProjectGrainDirectionsChange(override);

    expect(updateSpy).toHaveBeenCalledWith(override, { recordHistory: true });
    expect(component.projectGrainDirections()).toEqual(override);
    expect(component.userGrainDirections()).toEqual(DEFAULT_GRAIN_DIRECTIONS);
  });

  it('uses current cabinet order when displaying a project calculation error', () => {
    const state = TestBed.inject(KitchenStateService) as unknown as KitchenStateServiceStub;
    state.totalCabinetCount.set(2);
    state.walls.set([{
      id: 'wall-1',
      type: 'MAIN',
      widthMm: 3600,
      heightMm: 2600,
      cabinets: [
        { id: 'cabinet-1' },
        { id: 'cabinet-7', name: 'Zlew' }
      ]
    }]);

    const backendError = { error: { code: 'ex.cabinet.exceeds.wall.width' } };
    const workflow = TestBed.inject(KitchenProjectWorkflowFacade);
    const errorHandler = TestBed.inject(ApiErrorHandler);
    spyOn(workflow, 'calculateProject').and.returnValue(throwError(() => backendError));
    const handleSpy = spyOn(errorHandler, 'handle');
    spyOn(console, 'error');

    component.calculateProject();

    const displayOptions = handleSpy.calls.mostRecent().args[1];
    expect(displayOptions?.formatArgument?.('cabinetId', 'cabinet-7')).toBe('#2 „Zlew” (Ściana główna)');
    expect(component.isCalculatingProject()).toBeFalse();
  });

  describe('sygnały widoku (FE-35 OnPush migration)', () => {

    it('view() domyślnie równe "config" gdy brak zawartości', () => {
      expect(component.view()).toBe('config');
    });

    it('setView("costs") pozostaje na "config" gdy brak treści projektu', () => {
      // Guard canRenderCostsView(): totalCabinetCount=0 i projectResult=null → fallback do 'config'
      component.setView('costs');
      expect(component.view()).toBe('config');
    });

    it('setView("costs") przełącza widok gdy projectResult jest ustawiony', () => {
      component.projectResult.set({} as any);
      component.setView('costs');
      expect(component.view()).toBe('costs');
    });

    it('editingCabinetId() zwraca null gdy editingCabinet() jest null', () => {
      expect(component.editingCabinet()).toBeNull();
      expect(component.editingCabinetId()).toBeNull();
    });

    it('isCalculatingProject() startuje jako false', () => {
      expect(component.isCalculatingProject()).toBeFalse();
    });
  });

  describe('projekt wskazany w adresie strony', () => {
    it('blokuje edytor do odpowiedzi, a po wczytaniu czyści lokalny stan widoku', async () => {
      const response$ = new Subject<KitchenProjectDetailResponse>();
      const kitchenService = TestBed.inject(KitchenService);
      const getProjectSpy = spyOn(kitchenService, 'getProjectById').and.returnValue(response$);
      const guard = TestBed.inject(KitchenProjectTransitionGuardService);
      spyOn(guard, 'confirmUnsavedAndProceed').and.callFake(
        (_label: string, hooks: KitchenProjectTransitionHooks) => hooks.onProceed()
      );
      const state = TestBed.inject(KitchenStateService) as unknown as KitchenStateServiceStub;
      const saveSpy = spyOn(component, 'onSaveProject');

      component.ngOnInit();
      await TestBed.inject(Router).navigate([], { queryParams: { projectId: 12 } });

      expect(getProjectSpy).toHaveBeenCalledOnceWith(12);
      expect(component.isLoadingProjectFromUrl()).toBeTrue();
      expect(component.projectDisplayName()).toBe('Wczytywanie projektu…');
      sendKey('s', { ctrlKey: true });
      expect(saveSpy).not.toHaveBeenCalled();

      component.projectResult.set({} as any);
      response$.next({ id: 12, name: 'Kuchnia z linku' } as KitchenProjectDetailResponse);
      response$.complete();
      state.currentProjectName.set('Kuchnia z linku');

      expect(state.currentProjectId()).toBe(12);
      expect(component.isLoadingProjectFromUrl()).toBeFalse();
      expect(component.projectResult()).toBeNull();
      expect(component.projectDisplayName()).toBe('Kuchnia z linku');
    });

    it('po zapisie nowego projektu i po wyczyszczeniu adres wskazuje projekt z edytora', async () => {
      const router = TestBed.inject(Router);
      const state = TestBed.inject(KitchenStateService) as unknown as KitchenStateServiceStub;
      const guard = TestBed.inject(KitchenProjectTransitionGuardService);
      const workspaceActions = TestBed.inject(KitchenWorkspaceActionsFacade);
      spyOn(workspaceActions, 'confirmAndClearAll').and.returnValue(of(true));
      await router.navigate([], { queryParams: { projectId: 7 } });

      component.onSaveProject();
      state.currentProjectId.set(21);
      (guard.openSaveProjectDialogAndPersist as jasmine.Spy).calls.mostRecent().args[0].onSuccess();
      await fixture.whenStable();
      expect(router.url).toBe('/?projectId=21');

      state.currentProjectId.set(null);
      component.clearAll();
      await fixture.whenStable();
      expect(router.url).toBe('/');
    });
  });
});
