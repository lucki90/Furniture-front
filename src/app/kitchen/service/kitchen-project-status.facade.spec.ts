import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { KitchenProjectStatusFacade } from './kitchen-project-status.facade';
import { KitchenService } from './kitchen.service';
import { KitchenProjectDetailResponse } from '../model/kitchen-project.model';

describe('KitchenProjectStatusFacade', () => {
  let facade: KitchenProjectStatusFacade;
  let kitchenService: jasmine.SpyObj<KitchenService>;

  beforeEach(() => {
    kitchenService = jasmine.createSpyObj<KitchenService>('KitchenService', ['changeProjectStatus']);

    TestBed.configureTestingModule({
      providers: [
        KitchenProjectStatusFacade,
        { provide: KitchenService, useValue: kitchenService }
      ]
    });

    facade = TestBed.inject(KitchenProjectStatusFacade);
  });

  it('should map backend response to project info and status message', (done) => {
    kitchenService.changeProjectStatus.and.returnValue(of(createProjectDetailResponse({
      status: 'IN_PRODUCTION',
      allowedTransitions: ['IN_INSTALLATION']
    })));

    facade.changeStatus(21, 'IN_PRODUCTION').subscribe(result => {
      expect(kitchenService.changeProjectStatus).toHaveBeenCalledWith(21, 'IN_PRODUCTION');
      expect(result.projectInfo).toEqual({
        id: 21,
        name: 'Projekt testowy',
        version: 3,
        description: 'Opis',
        status: 'IN_PRODUCTION',
        allowedTransitions: ['IN_INSTALLATION'],
        clientName: 'Jan Kowalski',
        clientPhone: '123456789',
        clientEmail: 'jan@example.com'
      });
      expect(result.successMessage).toBe('Status zmieniony na: W produkcji');
      done();
    });
  });
});

function createProjectDetailResponse(overrides: Partial<KitchenProjectDetailResponse>): KitchenProjectDetailResponse {
  return {
    id: 21,
    name: 'Projekt testowy',
    description: 'Opis',
    clientName: 'Jan Kowalski',
    clientPhone: '123456789',
    clientEmail: 'jan@example.com',
    status: 'DRAFT',
    version: 3,
    allowedTransitions: ['OFFER_SENT'],
    plinthHeightMm: 100,
    countertopThicknessMm: 38,
    upperFillerHeightMm: 100,
    totalCost: 0,
    totalBoardsCost: 0,
    totalComponentsCost: 0,
    totalJobsCost: 0,
    walls: [],
    createdAt: '2026-04-17T10:00:00Z',
    updatedAt: '2026-04-17T10:00:00Z',
    ...overrides
  };
}
