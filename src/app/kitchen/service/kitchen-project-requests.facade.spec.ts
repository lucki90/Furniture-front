import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { KitchenProjectRequestsFacade } from './kitchen-project-requests.facade';
import { ProjectRequestBuilderService } from './project-request-builder.service';
import { ProjectSettingsService } from './project-settings.service';
import { ProjectMetadataService } from './project-metadata.service';
import { KitchenWorkspaceStore } from './kitchen-workspace.store';
import { WallWithCabinets } from '../model/kitchen-state.model';
import { ProjectWallRequest, WallConnectionRequest } from '../model/kitchen-project.model';

const STUB_WALL: WallWithCabinets = {
  id: 'w1',
  type: 'MAIN',
  widthMm: 3000,
  heightMm: 2600,
  cabinets: [],
  plinthConfig: undefined,
  countertopConfig: undefined
};

const STUB_PROJECT_WALL: ProjectWallRequest = {
  wallType: 'MAIN',
  widthMm: 3000,
  heightMm: 2600,
  cabinets: []
} as ProjectWallRequest;

const STUB_MATERIAL_DEFAULTS = { boxMaterial: 'CHIPBOARD' } as any;

describe('KitchenProjectRequestsFacade', () => {
  let facade: KitchenProjectRequestsFacade;
  let requestBuilderSpy: jasmine.SpyObj<ProjectRequestBuilderService>;
  let wallsSig: WritableSignal<WallWithCabinets[]>;
  let roomWidthSig: WritableSignal<number | null>;
  let roomDepthSig: WritableSignal<number | null>;
  let projectNameSig: WritableSignal<string | null>;
  let plinthHeightSig: WritableSignal<number>;
  let countertopThicknessSig: WritableSignal<number>;
  let upperFillerHeightSig: WritableSignal<number>;
  let fillerWidthSig: WritableSignal<number>;
  let materialDefaultsSig: WritableSignal<typeof STUB_MATERIAL_DEFAULTS>;

  beforeEach(() => {
    wallsSig = signal<WallWithCabinets[]>([STUB_WALL]);
    roomWidthSig = signal<number | null>(null);
    roomDepthSig = signal<number | null>(null);
    projectNameSig = signal<string | null>('Moja kuchnia');
    plinthHeightSig = signal(100);
    countertopThicknessSig = signal(38);
    upperFillerHeightSig = signal(100);
    fillerWidthSig = signal(50);
    materialDefaultsSig = signal(STUB_MATERIAL_DEFAULTS);

    requestBuilderSpy = jasmine.createSpyObj<ProjectRequestBuilderService>('ProjectRequestBuilderService', [
      'buildProjectWalls',
      'buildConnections'
    ]);
    requestBuilderSpy.buildProjectWalls.and.returnValue([STUB_PROJECT_WALL]);
    requestBuilderSpy.buildConnections.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        KitchenProjectRequestsFacade,
        { provide: ProjectRequestBuilderService, useValue: requestBuilderSpy },
        {
          provide: KitchenWorkspaceStore,
          useValue: { walls: wallsSig.asReadonly() }
        },
        {
          provide: ProjectSettingsService,
          useValue: {
            plinthHeightMm: plinthHeightSig.asReadonly(),
            countertopThicknessMm: countertopThicknessSig.asReadonly(),
            upperFillerHeightMm: upperFillerHeightSig.asReadonly(),
            fillerWidthMm: fillerWidthSig.asReadonly(),
            materialDefaults: materialDefaultsSig.asReadonly()
          }
        },
        {
          provide: ProjectMetadataService,
          useValue: {
            currentProjectName: projectNameSig.asReadonly(),
            currentProjectRoomWidthMm: roomWidthSig.asReadonly(),
            currentProjectRoomDepthMm: roomDepthSig.asReadonly()
          }
        }
      ]
    });

    facade = TestBed.inject(KitchenProjectRequestsFacade);
  });

  describe('buildProjectWalls', () => {
    it('przekazuje ściany i ustawienia projektu do requestBuilder', () => {
      facade.buildProjectWalls();

      expect(requestBuilderSpy.buildProjectWalls).toHaveBeenCalledWith(
        [STUB_WALL],
        jasmine.objectContaining({
          plinthHeightMm: 100,
          countertopThicknessMm: 38,
          upperFillerHeightMm: 100,
          fillerWidthMm: 50,
          materialDefaults: STUB_MATERIAL_DEFAULTS
        })
      );
    });

    it('zwraca wynik z requestBuilder', () => {
      expect(facade.buildProjectWalls()).toEqual([STUB_PROJECT_WALL]);
    });
  });

  describe('buildMultiWallCalculateRequest', () => {
    it('zawiera ściany zbudowane przez requestBuilder', () => {
      const request = facade.buildMultiWallCalculateRequest();

      expect(request.walls).toEqual([STUB_PROJECT_WALL]);
    });

    it('nie dołącza connections gdy lista jest pusta', () => {
      requestBuilderSpy.buildConnections.and.returnValue([]);

      const request = facade.buildMultiWallCalculateRequest();

      expect(request.connections).toBeUndefined();
    });

    it('dołącza connections gdy lista jest niepusta', () => {
      const connection: WallConnectionRequest = { wallIndexA: 0, wallIndexB: 1, connectionType: 'L_CORNER_LEFT' } as any;
      requestBuilderSpy.buildConnections.and.returnValue([connection]);

      const request = facade.buildMultiWallCalculateRequest();

      expect(request.connections).toEqual([connection]);
    });

    it('przekazuje roomWidthMm gdy ustawione', () => {
      roomWidthSig.set(4000);

      const request = facade.buildMultiWallCalculateRequest();

      expect(request.roomWidthMm).toBe(4000);
    });

    it('pomija roomWidthMm gdy null', () => {
      roomWidthSig.set(null);

      const request = facade.buildMultiWallCalculateRequest();

      expect(request.roomWidthMm).toBeUndefined();
    });

    it('przekazuje roomDepthMm gdy ustawione', () => {
      roomDepthSig.set(4200);

      const request = facade.buildMultiWallCalculateRequest();

      expect(request.roomDepthMm).toBe(4200);
    });
  });

  describe('buildMultiWallProjectRequest', () => {
    it('zawiera podaną nazwę projektu', () => {
      const request = facade.buildMultiWallProjectRequest('Nowy projekt');

      expect(request.name).toBe('Nowy projekt');
    });

    it('zawiera ściany, cokół, blat i blendę górną', () => {
      const request = facade.buildMultiWallProjectRequest('Test');

      expect(request.walls).toEqual([STUB_PROJECT_WALL]);
      expect(request.plinthHeightMm).toBe(100);
      expect(request.countertopThicknessMm).toBe(38);
      expect(request.upperFillerHeightMm).toBe(100);
    });

    it('zawiera opcjonalne dane klienta', () => {
      const request = facade.buildMultiWallProjectRequest('Test', 'opis', 'Jan', '123', 'jan@test.pl');

      expect(request.description).toBe('opis');
      expect(request.clientName).toBe('Jan');
      expect(request.clientPhone).toBe('123');
      expect(request.clientEmail).toBe('jan@test.pl');
    });

    it('pomija roomDepthMm gdy null', () => {
      roomDepthSig.set(null);

      const request = facade.buildMultiWallProjectRequest('Test');

      expect(request.roomDepthMm).toBeUndefined();
    });

    it('przekazuje wymiary pomieszczenia gdy są ustawione', () => {
      roomWidthSig.set(4000);
      roomDepthSig.set(4200);

      const request = facade.buildMultiWallProjectRequest('Test');

      expect(request.roomWidthMm).toBe(4000);
      expect(request.roomDepthMm).toBe(4200);
    });
  });

  describe('buildUpdateProjectRequest', () => {
    it('używa podanej nazwy', () => {
      const request = facade.buildUpdateProjectRequest('Zmieniona nazwa');

      expect(request.name).toBe('Zmieniona nazwa');
    });

    it('używa aktualnej nazwy projektu gdy name jest undefined', () => {
      projectNameSig.set('Istniejący projekt');

      const request = facade.buildUpdateProjectRequest();

      expect(request.name).toBe('Istniejący projekt');
    });

    it('używa "Bez nazwy" gdy name undefined i currentProjectName jest null', () => {
      projectNameSig.set(null);

      const request = facade.buildUpdateProjectRequest();

      expect(request.name).toBe('Bez nazwy');
    });

    it('przekazuje null dla obu wymiarów jawnie (kasowanie wymiarów)', () => {
      roomWidthSig.set(null);
      roomDepthSig.set(null);

      const request = facade.buildUpdateProjectRequest();

      expect(Object.prototype.hasOwnProperty.call(request, 'roomWidthMm')).toBeTrue();
      expect(Object.prototype.hasOwnProperty.call(request, 'roomDepthMm')).toBeTrue();
      expect(request.roomWidthMm).toBeNull();
      expect(request.roomDepthMm).toBeNull();
    });

    it('przekazuje oba wymiary gdy są ustawione', () => {
      roomWidthSig.set(4000);
      roomDepthSig.set(4200);

      const request = facade.buildUpdateProjectRequest();

      expect(request.roomWidthMm).toBe(4000);
      expect(request.roomDepthMm).toBe(4200);
    });
  });
});
