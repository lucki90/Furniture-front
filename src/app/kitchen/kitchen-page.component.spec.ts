import { signal, computed } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
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
import { EMPTY, of } from 'rxjs';

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
  undo = () => false;
  redo = () => false;
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
            confirmUnsavedAndProceed: () => {}
          }
        }
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
      component.isSavingProject = false;

      sendKey('s', { ctrlKey: true });

      expect(spy).toHaveBeenCalledOnceWith();
    });

    it('does not call onSaveProject when already saving', () => {
      const spy = spyOn(component, 'onSaveProject');
      component.isSavingProject = true;

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
});
