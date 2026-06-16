import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { KitchenProjectDetailResponse, KitchenProjectListResponse } from '../model/kitchen-project.model';
import { KitchenProjectTransitionGuardService } from '../service/kitchen-project-transition-guard.service';
import { KitchenService } from '../service/kitchen.service';
import { KitchenStateService } from '../service/kitchen-state.service';
import { KitchenProjectsListComponent } from './kitchen-projects-list.component';

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

describe('KitchenProjectsListComponent - klonowanie i przejscia projektu', () => {
  let component: KitchenProjectsListComponent;
  let fixture: ComponentFixture<KitchenProjectsListComponent>;
  let kitchenService: jasmine.SpyObj<KitchenService>;
  let transitionGuard: jasmine.SpyObj<KitchenProjectTransitionGuardService>;
  let stateService: jasmine.SpyObj<KitchenStateService>;
  let router: Router;

  beforeEach(async () => {
    kitchenService = jasmine.createSpyObj('KitchenService', ['getProjects', 'getProjectById', 'cloneProject']);
    transitionGuard = jasmine.createSpyObj('KitchenProjectTransitionGuardService', [
      'confirmUnsavedAndProceed'
    ]);
    transitionGuard.confirmUnsavedAndProceed.and.callFake((_targetLabel, hooks) => {
      hooks.onProceed();
    });
    stateService = jasmine.createSpyObj('KitchenStateService', ['loadProject', 'clearAll', 'startNewProject']);
    Object.assign(stateService, {
      currentProjectId: jasmine.createSpy('currentProjectId').and.returnValue(null)
    });
    kitchenService.getProjects.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [KitchenProjectsListComponent],
      providers: [
        provideRouter([]),
        { provide: KitchenService, useValue: kitchenService },
        { provide: KitchenProjectTransitionGuardService, useValue: transitionGuard },
        { provide: KitchenStateService, useValue: stateService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KitchenProjectsListComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('po udanym klonowaniu laduje projekt i nawiguje do niego przez guard', () => {
    kitchenService.cloneProject.and.returnValue(of(CLONED));
    const navigate = spyOn(router, 'navigate');

    component.cloneProject(1);

    expect(transitionGuard.confirmUnsavedAndProceed).toHaveBeenCalled();
    expect(kitchenService.cloneProject).toHaveBeenCalledWith(1);
    expect(stateService.loadProject).toHaveBeenCalledWith(CLONED);
    expect(navigate).toHaveBeenCalledWith(['/kitchen'], { queryParams: { projectId: 99 } });
    expect(component.cloningProjectId).toBeNull();
  });

  it('po bledzie ustawia komunikat i czysci cloningProjectId', () => {
    kitchenService.cloneProject.and.returnValue(throwError(() => new Error('server error')));

    component.cloneProject(1);

    expect(component.error).toBe('Nie udało się sklonować projektu');
    expect(component.cloningProjectId).toBeNull();
  });

  it('guard blokuje rownolegle klonowanie gdy inne jest w toku', () => {
    component.cloningProjectId = 2;

    component.cloneProject(1);

    expect(transitionGuard.confirmUnsavedAndProceed).not.toHaveBeenCalled();
    expect(kitchenService.cloneProject).not.toHaveBeenCalled();
  });

  it('ustawia cloningProjectId na czas trwania zadania', () => {
    let capturedId: unknown = null;
    kitchenService.cloneProject.and.callFake(() => {
      capturedId = component.cloningProjectId;
      return of(CLONED);
    });

    component.cloneProject(42);

    expect(capturedId).toBe(42);
    expect(component.cloningProjectId).toBeNull();
  });

  it('przycisk klonowania jest wylaczony gdy cloningProjectId pasuje do projektu', () => {
    component.projects = [PROJECT];
    component['updateFilteredList']();
    component.cloningProjectId = 1;
    fixture.detectChanges();

    const cloneButtons = Array.from(
      fixture.nativeElement.querySelectorAll('button')
    ) as HTMLButtonElement[];
    const cloneBtn = cloneButtons.find(button => button.textContent?.includes('Klonuj'));
    expect(cloneBtn).toBeTruthy();
    expect(cloneBtn?.disabled).toBeTrue();
  });

  it('nowy projekt przechodzi przez guard i startNewProject', () => {
    const navigate = spyOn(router, 'navigate');

    component.createNewProject();

    expect(transitionGuard.confirmUnsavedAndProceed).toHaveBeenCalled();
    expect(stateService.startNewProject).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/kitchen']);
  });
});
