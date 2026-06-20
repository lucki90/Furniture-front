import { WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { KitchenProjectListResponse } from '../model/kitchen-project.model';
import { KitchenProjectTransitionGuardService } from '../service/kitchen-project-transition-guard.service';
import { KitchenProjectsActionsService } from '../service/kitchen-projects-actions.service';
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

describe('KitchenProjectsListComponent', () => {
  let component: KitchenProjectsListComponent;
  let fixture: ComponentFixture<KitchenProjectsListComponent>;
  let actionsService: {
    projects: WritableSignal<KitchenProjectListResponse[]>;
    loading: WritableSignal<boolean>;
    error: WritableSignal<string | null>;
    cloningProjectId: WritableSignal<number | null>;
    deleteConfirmationProjectId: WritableSignal<number | null>;
    deletingProjectId: WritableSignal<number | null>;
    loadProjects: jasmine.Spy;
    openProject: jasmine.Spy;
    confirmDelete: jasmine.Spy;
    cancelDelete: jasmine.Spy;
    deleteProject: jasmine.Spy;
    cloneProject: jasmine.Spy;
    createNewProject: jasmine.Spy;
  };
  let transitionInProgress: WritableSignal<boolean>;
  let stateService: jasmine.SpyObj<KitchenStateService>;

  beforeEach(async () => {
    actionsService = {
      projects: signal([]),
      loading: signal(false),
      error: signal(null),
      cloningProjectId: signal(null),
      deleteConfirmationProjectId: signal(null),
      deletingProjectId: signal(null),
      loadProjects: jasmine.createSpy('loadProjects'),
      openProject: jasmine.createSpy('openProject'),
      confirmDelete: jasmine.createSpy('confirmDelete'),
      cancelDelete: jasmine.createSpy('cancelDelete'),
      deleteProject: jasmine.createSpy('deleteProject'),
      cloneProject: jasmine.createSpy('cloneProject'),
      createNewProject: jasmine.createSpy('createNewProject'),
    };

    transitionInProgress = signal(false);
    const transitionGuard = jasmine.createSpyObj('KitchenProjectTransitionGuardService', [
      'confirmUnsavedAndProceed'
    ]);
    Object.assign(transitionGuard, { isTransitioning: transitionInProgress.asReadonly() });

    stateService = jasmine.createSpyObj('KitchenStateService', ['loadProject', 'clearAll', 'startNewProject']);
    Object.assign(stateService, { currentProjectId: signal(null) });

    await TestBed.configureTestingModule({
      imports: [KitchenProjectsListComponent],
      providers: [
        provideRouter([]),
        { provide: KitchenProjectsActionsService, useValue: actionsService },
        { provide: KitchenProjectTransitionGuardService, useValue: transitionGuard },
        { provide: KitchenStateService, useValue: stateService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KitchenProjectsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deleguje loadProjects do serwisu akcji przy inicjalizacji', () => {
    expect(actionsService.loadProjects).toHaveBeenCalled();
  });

  it('deleguje cloneProject do serwisu akcji', () => {
    component.cloneProject(1);
    expect(actionsService.cloneProject).toHaveBeenCalledWith(1);
  });

  it('deleguje createNewProject do serwisu akcji', () => {
    component.createNewProject();
    expect(actionsService.createNewProject).toHaveBeenCalled();
  });

  it('blokuje przyciski akcji projektu gdy trwa przejście', () => {
    actionsService.projects.set([PROJECT]);
    fixture.detectChanges();
    transitionInProgress.set(true);
    fixture.detectChanges();

    const buttons = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'));
    const newProjectButton = buttons.find(b => b.textContent?.includes('Nowy projekt'));
    const openButton = buttons.find(b => b.textContent?.includes('Otworz'));
    const cloneButton = buttons.find(b => b.textContent?.includes('Klonuj'));

    expect(newProjectButton?.disabled).toBeTrue();
    expect(openButton?.disabled).toBeTrue();
    expect(cloneButton?.disabled).toBeTrue();
  });

  it('przycisk klonowania jest wylaczony gdy cloningProjectId pasuje do projektu', () => {
    actionsService.projects.set([PROJECT]);
    fixture.detectChanges();
    actionsService.cloningProjectId.set(1);
    fixture.detectChanges();

    const cloneButtons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const cloneBtn = cloneButtons.find(b => b.textContent?.includes('Klonuje'));
    expect(cloneBtn).toBeTruthy();
    expect(cloneBtn?.disabled).toBeTrue();
  });

  it('pokazuje stan usuwania i blokuje odświeżenie podczas requestu DELETE', () => {
    actionsService.projects.set([PROJECT]);
    actionsService.deletingProjectId.set(PROJECT.id);
    fixture.detectChanges();

    const buttons = Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'));
    const refreshButton = buttons.find(button => button.textContent?.includes('Odswiez'));
    const overlay = fixture.nativeElement.querySelector('.project-card__overlay') as HTMLElement;

    expect(refreshButton?.disabled).toBeTrue();
    expect(overlay.textContent).toContain('Usuwanie projektu');
    expect(overlay.querySelector('.btn-danger')).toBeNull();
  });

  it('filtruje projekty po statusie', () => {
    const projectDraft: KitchenProjectListResponse = { ...PROJECT, id: 1, status: 'DRAFT' };
    const projectAccepted: KitchenProjectListResponse = { ...PROJECT, id: 2, status: 'ACCEPTED' };
    actionsService.projects.set([projectDraft, projectAccepted]);
    fixture.detectChanges();

    expect(component.filteredAndSortedProjects.length).toBe(2);

    component.toggleStatusFilter('DRAFT');
    expect(component.filteredAndSortedProjects.length).toBe(1);
    expect(component.filteredAndSortedProjects[0].status).toBe('DRAFT');

    component.clearFilters();
    expect(component.filteredAndSortedProjects.length).toBe(2);
  });

  it('sortuje projekty po kosztach', () => {
    const cheap: KitchenProjectListResponse = { ...PROJECT, id: 1, totalCost: 100 };
    const expensive: KitchenProjectListResponse = { ...PROJECT, id: 2, totalCost: 999 };
    actionsService.projects.set([expensive, cheap]);
    fixture.detectChanges();

    component.setSortField('totalCost');
    expect(component.filteredAndSortedProjects[0].id).toBe(2);

    component.setSortField('totalCost');
    expect(component.filteredAndSortedProjects[0].id).toBe(1);
  });
});
