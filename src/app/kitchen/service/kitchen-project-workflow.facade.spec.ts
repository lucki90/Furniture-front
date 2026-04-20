import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { KitchenProjectWorkflowFacade } from './kitchen-project-workflow.facade';
import { KitchenService } from './kitchen.service';
import { ProjectDetailsAggregatorService } from './project-details-aggregator.service';
import {
  CreateKitchenProjectRequest,
  KitchenProjectDetailResponse,
  MultiWallCalculateResponse,
  UpdateKitchenProjectRequest
} from '../model/kitchen-project.model';
import { SaveProjectDialogResult } from '../save-project-dialog/save-project-dialog.component';

describe('KitchenProjectWorkflowFacade', () => {
  let facade: KitchenProjectWorkflowFacade;
  let kitchenService: jasmine.SpyObj<KitchenService>;
  let aggregatorService: jasmine.SpyObj<ProjectDetailsAggregatorService>;

  beforeEach(() => {
    kitchenService = jasmine.createSpyObj<KitchenService>('KitchenService', [
      'createProject',
      'updateProject',
      'calculateMultiWall'
    ]);
    aggregatorService = jasmine.createSpyObj<ProjectDetailsAggregatorService>('ProjectDetailsAggregatorService', [
      'aggregate',
      'collectPricingWarnings',
      'collectCornerCountertopPricingWarnings'
    ]);

    TestBed.configureTestingModule({
      providers: [
        KitchenProjectWorkflowFacade,
        { provide: KitchenService, useValue: kitchenService },
        { provide: ProjectDetailsAggregatorService, useValue: aggregatorService }
      ]
    });

    facade = TestBed.inject(KitchenProjectWorkflowFacade);
  });

  it('should create a project and map response metadata', (done) => {
    const dialogResult = createDialogResult();
    const createRequest = { name: 'Projekt testowy', walls: [] } as CreateKitchenProjectRequest;
    const response = createProjectDetailResponse({ id: 11, version: 1, status: 'DRAFT' });
    const buildUpdateRequest = jasmine.createSpy();

    kitchenService.createProject.and.returnValue(of(response));

    facade.saveProject(null, dialogResult, {
      buildCreateRequest: jasmine.createSpy().and.returnValue(createRequest),
      buildUpdateRequest
    }).subscribe(result => {
      expect(kitchenService.createProject).toHaveBeenCalledWith(createRequest);
      expect(buildUpdateRequest).not.toHaveBeenCalled();
      expect(result.successMessage).toBe('Projekt został zapisany');
      expect(result.projectInfo).toEqual({
        id: 11,
        name: 'Projekt testowy',
        version: 1,
        description: 'Opis',
        status: 'DRAFT',
        allowedTransitions: ['OFFER_SENT'],
        clientName: 'Jan Kowalski',
        clientPhone: '123456789',
        clientEmail: 'jan@example.com'
      });
      done();
    });
  });

  it('should update an existing project and map response metadata', (done) => {
    const dialogResult = createDialogResult();
    const updateRequest = { name: 'Projekt testowy', walls: [] } as UpdateKitchenProjectRequest;
    const response = createProjectDetailResponse({ id: 7, version: 4, status: 'OFFER_SENT' });
    const buildCreateRequest = jasmine.createSpy();
    const buildUpdateRequest = jasmine.createSpy().and.returnValue(updateRequest);

    kitchenService.updateProject.and.returnValue(of(response));

    facade.saveProject(7, dialogResult, {
      buildCreateRequest,
      buildUpdateRequest
    }).subscribe(result => {
      expect(buildCreateRequest).not.toHaveBeenCalled();
      expect(buildUpdateRequest).toHaveBeenCalledWith(dialogResult);
      expect(kitchenService.updateProject).toHaveBeenCalledWith(7, updateRequest);
      expect(result.successMessage).toBe('Projekt został zaktualizowany');
      expect(result.projectInfo.status).toBe('OFFER_SENT');
      done();
    });
  });

  it('should calculate a project and merge wall plus corner pricing warnings', (done) => {
    const request = { walls: [] } as any;
    const frontendWalls = [{ id: 'wall-1' }] as any;
    const response = {
      walls: [{ wallType: 'MAIN' }, { wallType: 'LEFT' }],
      cornerCountertops: [{ wallAIndex: 0, wallBIndex: 1 }],
      totalProjectCost: 1000
    } as unknown as MultiWallCalculateResponse;
    const aggregation = {
      boards: [{ material: 'BOARD' }],
      components: [{ name: 'HINGE' }],
      jobs: [{ name: 'CUTTING' }],
      wasteCost: 55,
      wasteDetails: [{ name: 'WASTE' }]
    };

    kitchenService.calculateMultiWall.and.returnValue(of(response));
    aggregatorService.aggregate.and.returnValue(aggregation as any);
    aggregatorService.collectPricingWarnings.withArgs(response.walls[0] as any).and.returnValue(['PLINTH.MATERIAL']);
    aggregatorService.collectPricingWarnings.withArgs(response.walls[1] as any).and.returnValue(['PLINTH.MATERIAL', 'COUNTERTOP.MATERIAL']);
    aggregatorService.collectCornerCountertopPricingWarnings.and.returnValue(['CORNER_COUNTERTOP.JOINT']);

    facade.calculateProject(request, frontendWalls, { 'BOARD_NAME.SIDE_NAME': 'Bok' }).subscribe(result => {
      expect(kitchenService.calculateMultiWall).toHaveBeenCalledWith(request);
      expect(aggregatorService.aggregate).toHaveBeenCalledWith(response, frontendWalls, { 'BOARD_NAME.SIDE_NAME': 'Bok' });
      expect(result.response).toBe(response);
      expect(result.aggregation).toBe(aggregation as any);
      expect(result.pricingWarnings).toEqual([
        'PLINTH.MATERIAL',
        'COUNTERTOP.MATERIAL',
        'CORNER_COUNTERTOP.JOINT'
      ]);
      done();
    });
  });
});

function createDialogResult(): SaveProjectDialogResult {
  return {
    name: 'Projekt testowy',
    description: 'Opis',
    clientName: 'Jan Kowalski',
    clientPhone: '123456789',
    clientEmail: 'jan@example.com'
  };
}

function createProjectDetailResponse(overrides: Partial<KitchenProjectDetailResponse>): KitchenProjectDetailResponse {
  return {
    id: 1,
    name: 'Projekt testowy',
    description: 'Opis z backendu',
    clientName: 'Klient z backendu',
    clientPhone: '999',
    clientEmail: 'backend@example.com',
    status: 'DRAFT',
    version: 1,
    allowedTransitions: ['OFFER_SENT'],
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
