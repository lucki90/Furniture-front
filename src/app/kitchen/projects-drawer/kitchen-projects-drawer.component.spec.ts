import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { ToastService } from '../../core/error/toast.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { BodyScrollLockService } from '../../shared/dom/body-scroll-lock.service';
import { KitchenProjectDetailResponse, KitchenProjectListResponse, WallDetailResponse } from '../model/kitchen-project.model';
import { KitchenService } from '../service/kitchen.service';
import { KitchenProjectsDrawerComponent } from './kitchen-projects-drawer.component';

const PROJECTS: KitchenProjectListResponse[] = [
  {
    id: 1,
    name: 'Kuchnia Glowka',
    status: 'DRAFT',
    totalCost: 1200,
    wallCount: 1,
    cabinetCount: 3,
    version: 2,
    createdAt: '2026-05-01T10:00:00',
    updatedAt: '2026-05-12T10:00:00'
  },
  {
    id: 2,
    name: 'Loft Island',
    status: 'ACCEPTED',
    totalCost: 8800,
    wallCount: 2,
    cabinetCount: 9,
    version: 1,
    createdAt: '2026-05-02T10:00:00',
    updatedAt: '2026-05-11T10:00:00'
  }
];

const CLONED_WALL: WallDetailResponse = {
  id: 1,
  wallType: 'MAIN',
  widthMm: 3600,
  heightMm: 2600,
  wallCost: 1200,
  cabinets: [],
  cabinetCount: 3,
  usedWidthMm: 1200,
  remainingWidthMm: 2400
};

const CLONED: KitchenProjectDetailResponse = {
  id: 99,
  name: 'Kuchnia Glowka (kopia)',
  status: 'DRAFT',
  version: 1,
  totalCost: 1200,
  totalBoardsCost: 900,
  totalComponentsCost: 200,
  totalJobsCost: 100,
  walls: [CLONED_WALL],
  createdAt: '2026-05-13T10:00:00',
  updatedAt: '2026-05-13T10:00:00'
};

/** Rodzic jak `KitchenPageComponent`: OnPush, więc odpowiedź HTTP sama go nie odświeża. */
@Component({
  standalone: true,
  imports: [KitchenProjectsDrawerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<app-kitchen-projects-drawer [open]="open()"></app-kitchen-projects-drawer>'
})
class OnPushHostComponent {
  readonly open = signal(false);
}

describe('KitchenProjectsDrawerComponent', () => {
  let fixture: ComponentFixture<KitchenProjectsDrawerComponent>;
  let component: KitchenProjectsDrawerComponent;
  let kitchenService: jasmine.SpyObj<KitchenService>;
  let bodyScrollLock: jasmine.SpyObj<BodyScrollLockService>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;

  beforeEach(async () => {
    kitchenService = jasmine.createSpyObj<KitchenService>('KitchenService', ['getProjects', 'cloneProject', 'deleteProject']);
    kitchenService.getProjects.and.returnValue(of(PROJECTS));
    kitchenService.cloneProject.and.returnValue(of(CLONED));
    kitchenService.deleteProject.and.returnValue(of(void 0));
    bodyScrollLock = jasmine.createSpyObj<BodyScrollLockService>('BodyScrollLockService', ['lock', 'unlock']);
    confirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [KitchenProjectsDrawerComponent],
      providers: [
        { provide: KitchenService, useValue: kitchenService },
        { provide: ConfirmDialogService, useValue: confirmDialog },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success']) },
        { provide: BodyScrollLockService, useValue: bodyScrollLock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KitchenProjectsDrawerComponent);
    component = fixture.componentInstance;
  });

  it('loads projects when drawer opens', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(kitchenService.getProjects).toHaveBeenCalled();
    expect(component.visibleProjects().length).toBe(2);
    expect(bodyScrollLock.lock).toHaveBeenCalled();
  });

  it('releases body scroll lock when drawer closes', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();

    expect(bodyScrollLock.unlock).toHaveBeenCalled();
  });

  it('filters visible projects by search query', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    component.onSearchChange('loft');

    expect(component.visibleProjects().length).toBe(1);
    expect(component.visibleProjects()[0].id).toBe(2);
    expect(component.projectsCountLabel()).toBe('1 z 2 projektow');
  });

  it('toggles status filter and resets filters', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    component.selectStatus('ACCEPTED');
    expect(component.visibleProjects().map(project => project.id)).toEqual([2]);

    component.selectStatus('ACCEPTED');
    expect(component.activeStatus()).toBeNull();
    expect(component.visibleProjects().length).toBe(2);

    component.onSearchChange('brak');
    component.selectStatus('DRAFT');
    component.resetFilters();
    expect(component.searchQuery()).toBe('');
    expect(component.visibleProjects().length).toBe(2);
  });

  it('emits open request for non-current project', () => {
    spyOn(component.openProjectRequested, 'emit');
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('currentProjectId', 2);
    fixture.detectChanges();

    component.requestOpenProject(1);

    expect(component.openProjectRequested.emit).toHaveBeenCalledWith(1);
  });

  it('does not emit open request for current project', () => {
    spyOn(component.openProjectRequested, 'emit');
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('currentProjectId', 2);
    fixture.detectChanges();

    component.requestOpenProject(2);

    expect(component.openProjectRequested.emit).not.toHaveBeenCalled();
  });

  it('keeps current project open when cloning and prepends clone to list', () => {
    spyOn(component.openProjectRequested, 'emit');
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('currentProjectId', 1);
    fixture.detectChanges();

    component.cloneProject(1);

    expect(kitchenService.cloneProject).toHaveBeenCalledWith(1);
    expect(component.projects()[0].id).toBe(99);
    expect(component.openProjectRequested.emit).not.toHaveBeenCalled();
  });

  it('removes deleted project from the rendered list', () => {
    confirmDialog.confirm.and.returnValue(of(true));
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    component.confirmDelete(PROJECTS[1]);
    fixture.detectChanges();

    expect(kitchenService.deleteProject).toHaveBeenCalledWith(2);
    expect(component.deletingProjectId()).toBeNull();
    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.drawer-project-card');
    expect(cards.length).toBe(1);
  });

  it('renders projects that arrive asynchronously inside an OnPush parent', () => {
    const response = new Subject<KitchenProjectListResponse[]>();
    kitchenService.getProjects.and.returnValue(response);
    const hostFixture = TestBed.createComponent(OnPushHostComponent);
    const element = hostFixture.nativeElement as HTMLElement;
    hostFixture.detectChanges();

    hostFixture.componentInstance.open.set(true);
    hostFixture.detectChanges();
    expect(element.querySelector('.drawer-state--loading')).not.toBeNull();

    response.next(PROJECTS);
    hostFixture.detectChanges();

    expect(element.querySelector('.drawer-state--loading')).toBeNull();
    expect(element.querySelectorAll('.drawer-project-card').length).toBe(2);
    expect(element.querySelector('.projects-drawer__count')?.textContent).toContain('2 z 2');
  });
});
