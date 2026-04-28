import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { KitchenProjectsListComponent } from './kitchen-projects-list.component';
import { KitchenService } from '../service/kitchen.service';
import { KitchenStateService } from '../service/kitchen-state.service';
import { KitchenProjectDetailResponse, KitchenProjectListResponse } from '../model/kitchen-project.model';

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
  name: 'Kopia — Test Kitchen',
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

describe('KitchenProjectsListComponent — klonowanie', () => {
  let component: KitchenProjectsListComponent;
  let fixture: ComponentFixture<KitchenProjectsListComponent>;
  let kitchenService: jasmine.SpyObj<KitchenService>;
  let stateService: jasmine.SpyObj<KitchenStateService>;
  let router: Router;

  beforeEach(async () => {
    kitchenService = jasmine.createSpyObj('KitchenService', ['getProjects', 'cloneProject']);
    stateService = jasmine.createSpyObj('KitchenStateService', ['loadProject', 'clearAll']);
    kitchenService.getProjects.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [KitchenProjectsListComponent],
      providers: [
        provideRouter([]),
        { provide: KitchenService, useValue: kitchenService },
        { provide: KitchenStateService, useValue: stateService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KitchenProjectsListComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('po udanym klonowaniu ładuje projekt i nawiguje do niego', () => {
    kitchenService.cloneProject.and.returnValue(of(CLONED));
    const navigate = spyOn(router, 'navigate');

    component.cloneProject(1);

    expect(kitchenService.cloneProject).toHaveBeenCalledWith(1);
    expect(stateService.loadProject).toHaveBeenCalledWith(CLONED);
    expect(navigate).toHaveBeenCalledWith(['/kitchen'], { queryParams: { projectId: 99 } });
    expect(component.cloningProjectId).toBeNull();
  });

  it('po błędzie ustawia komunikat i czyści cloningProjectId', () => {
    kitchenService.cloneProject.and.returnValue(throwError(() => new Error('server error')));

    component.cloneProject(1);

    expect(component.error).toBe('Nie udało się sklonować projektu');
    expect(component.cloningProjectId).toBeNull();
  });

  it('guard blokuje równoległe klonowanie gdy inne jest w toku', () => {
    component.cloningProjectId = 2;

    component.cloneProject(1);

    expect(kitchenService.cloneProject).not.toHaveBeenCalled();
  });

  it('ustawia cloningProjectId na czas trwania żądania', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let capturedId: any;
    kitchenService.cloneProject.and.callFake(() => {
      capturedId = component.cloningProjectId;
      return of(CLONED);
    });

    component.cloneProject(42);

    expect(capturedId).toBe(42);
    expect(component.cloningProjectId).toBeNull();
  });

  it('przycisk klonowania jest wyłączony gdy cloningProjectId pasuje do projektu', () => {
    component.projects = [PROJECT];
    component['updateFilteredList']();
    component.cloningProjectId = 1;
    fixture.detectChanges();

    const cloneBtn: HTMLButtonElement = fixture.nativeElement.querySelector('button[title="Klonuj projekt"]');
    expect(cloneBtn).toBeTruthy();
    expect(cloneBtn.disabled).toBeTrue();
  });
});
