import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { KitchenProjectDetailResponse } from '../model/kitchen-project.model';
import { KitchenService } from './kitchen.service';
import { KitchenProjectVersionsFacade } from './kitchen-project-versions.facade';
import { KitchenStateService } from './kitchen-state.service';
import { ProjectHistoryService } from './project-history.service';

describe('KitchenProjectVersionsFacade', () => {
  const version2 = { id: 6, version: 2, name: 'Kuchnia', walls: [] } as unknown as KitchenProjectDetailResponse;
  let history: jasmine.SpyObj<ProjectHistoryService>;
  let kitchen: jasmine.SpyObj<KitchenService>;
  let state: jasmine.SpyObj<KitchenStateService>;
  let facade: KitchenProjectVersionsFacade;

  beforeEach(() => {
    history = jasmine.createSpyObj<ProjectHistoryService>('ProjectHistoryService', ['getVersion']);
    kitchen = jasmine.createSpyObj<KitchenService>('KitchenService', ['cloneProject', 'getProjectById']);
    state = jasmine.createSpyObj<KitchenStateService>('KitchenStateService', ['openProjectVersion', 'loadProject']);
    TestBed.configureTestingModule({
      providers: [
        { provide: ProjectHistoryService, useValue: history },
        { provide: KitchenService, useValue: kitchen },
        { provide: KitchenStateService, useValue: state }
      ]
    });
    facade = TestBed.inject(KitchenProjectVersionsFacade);
  });

  it('otwarcie wersji wczytuje ją jako niezapisaną treść bieżącego projektu', () => {
    history.getVersion.and.returnValue(of(version2));

    facade.openVersion(6, 2).subscribe();

    expect(history.getVersion).toHaveBeenCalledWith(6, 2);
    expect(state.openProjectVersion).toHaveBeenCalledWith(version2);
  });

  it('kopia wersji tworzy nowy projekt z tej wersji i go otwiera', () => {
    const clone = { ...version2, id: 9, version: 1 } as KitchenProjectDetailResponse;
    kitchen.cloneProject.and.returnValue(of(clone));

    facade.cloneVersion(6, 2).subscribe();

    expect(kitchen.cloneProject).toHaveBeenCalledWith(6, undefined, 2);
    expect(state.loadProject).toHaveBeenCalledWith(clone);
  });

  it('powrót do bieżącej wczytuje zapisany projekt', () => {
    kitchen.getProjectById.and.returnValue(of(version2));

    facade.returnToCurrent(6).subscribe();

    expect(state.loadProject).toHaveBeenCalledWith(version2);
  });
});
