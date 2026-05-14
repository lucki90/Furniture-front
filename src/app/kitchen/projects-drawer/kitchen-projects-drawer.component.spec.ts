import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ToastService } from '../../core/error/toast.service';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
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

describe('KitchenProjectsDrawerComponent', () => {
  let fixture: ComponentFixture<KitchenProjectsDrawerComponent>;
  let component: KitchenProjectsDrawerComponent;
  let kitchenService: jasmine.SpyObj<KitchenService>;

  beforeEach(async () => {
    kitchenService = jasmine.createSpyObj<KitchenService>('KitchenService', ['getProjects', 'cloneProject', 'deleteProject']);
    kitchenService.getProjects.and.returnValue(of(PROJECTS));
    kitchenService.cloneProject.and.returnValue(of(CLONED));
    kitchenService.deleteProject.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [KitchenProjectsDrawerComponent],
      providers: [
        { provide: KitchenService, useValue: kitchenService },
        { provide: ConfirmDialogService, useValue: jasmine.createSpyObj('ConfirmDialogService', ['confirm']) },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KitchenProjectsDrawerComponent);
    component = fixture.componentInstance;
  });

  it('loads projects when drawer opens', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(kitchenService.getProjects).toHaveBeenCalled();
    expect(component.visibleProjects.length).toBe(2);
  });

  it('filters visible projects by search query', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    component.searchQuery = 'loft';
    component.onSearchChange();

    expect(component.visibleProjects.length).toBe(1);
    expect(component.visibleProjects[0].id).toBe(2);
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
    expect(component.projects[0].id).toBe(99);
    expect(component.openProjectRequested.emit).not.toHaveBeenCalled();
  });
});
