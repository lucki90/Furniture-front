import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { KitchenWallMetricsService } from './kitchen-wall-metrics.service';
import { KitchenWorkspaceStore } from './kitchen-workspace.store';
import { ProjectSettingsService } from './project-settings.service';
import { KitchenGeometryService } from './kitchen-geometry.service';
import { KitchenCabinet, WallWithCabinets } from '../model/kitchen-state.model';

const WALL_ID = 'w1';

function makeWall(overrides: Partial<WallWithCabinets> = {}): WallWithCabinets {
  return {
    id: WALL_ID,
    type: 'MAIN',
    widthMm: 3000,
    heightMm: 2600,
    cabinets: [],
    plinthConfig: undefined,
    countertopConfig: undefined,
    ...overrides
  };
}

describe('KitchenWallMetricsService', () => {
  let service: KitchenWallMetricsService;
  let wallsSig: WritableSignal<WallWithCabinets[]>;
  let selectedWallIdSig: WritableSignal<string | null>;
  let fillerWidthSig: WritableSignal<number>;
  let plinthHeightSig: WritableSignal<number>;
  let countertopThicknessSig: WritableSignal<number>;
  let upperFillerHeightSig: WritableSignal<number>;
  let geometryServiceSpy: jasmine.SpyObj<KitchenGeometryService>;

  beforeEach(() => {
    wallsSig = signal<WallWithCabinets[]>([makeWall()]);
    selectedWallIdSig = signal<string | null>(WALL_ID);
    fillerWidthSig = signal(50);
    plinthHeightSig = signal(100);
    countertopThicknessSig = signal(38);
    upperFillerHeightSig = signal(100);

    geometryServiceSpy = jasmine.createSpyObj<KitchenGeometryService>('KitchenGeometryService', [
      'calculateUsedWidth',
      'calculateCabinetPositions'
    ]);
    geometryServiceSpy.calculateUsedWidth.and.returnValue(0);
    geometryServiceSpy.calculateCabinetPositions.and.returnValue([]);

    TestBed.configureTestingModule({
      providers: [
        KitchenWallMetricsService,
        {
          provide: KitchenWorkspaceStore,
          useValue: { walls: wallsSig.asReadonly(), selectedWallId: selectedWallIdSig.asReadonly() }
        },
        {
          provide: ProjectSettingsService,
          useValue: {
            fillerWidthMm: fillerWidthSig.asReadonly(),
            plinthHeightMm: plinthHeightSig.asReadonly(),
            countertopThicknessMm: countertopThicknessSig.asReadonly(),
            upperFillerHeightMm: upperFillerHeightSig.asReadonly()
          }
        },
        { provide: KitchenGeometryService, useValue: geometryServiceSpy }
      ]
    });

    service = TestBed.inject(KitchenWallMetricsService);
  });

  describe('delegowanie do geometryService', () => {
    it('usedWidthBottom wywołuje calculateUsedWidth z typem BOTTOM', () => {
      geometryServiceSpy.calculateUsedWidth.and.callFake((_cabs, zone) => zone === 'BOTTOM' ? 1200 : 900);

      expect(service.usedWidthBottom()).toBe(1200);
      expect(geometryServiceSpy.calculateUsedWidth).toHaveBeenCalledWith([], 'BOTTOM', 50, 'MAIN');
    });

    it('usedWidthTop wywołuje calculateUsedWidth z typem TOP', () => {
      geometryServiceSpy.calculateUsedWidth.and.callFake((_cabs, zone) => zone === 'TOP' ? 800 : 0);

      expect(service.usedWidthTop()).toBe(800);
      expect(geometryServiceSpy.calculateUsedWidth).toHaveBeenCalledWith([], 'TOP', 50, 'MAIN');
    });

    it('cabinetPositions wywołuje calculateCabinetPositions z poprawnymi ustawieniami', () => {
      const mockPositions = [{ id: 'c1' } as any];
      geometryServiceSpy.calculateCabinetPositions.and.returnValue(mockPositions);

      expect(service.cabinetPositions()).toBe(mockPositions);
      expect(geometryServiceSpy.calculateCabinetPositions).toHaveBeenCalledWith(
        [],
        jasmine.objectContaining({
          wallType: 'MAIN',
          wallHeightMm: 2600,
          plinthHeightMm: 100,
          countertopThicknessMm: 38,
          upperFillerHeightMm: 100,
          fillerWidthMm: 50
        })
      );
    });

    it('szafki ze ściany są przekazywane do calculateCabinetPositions', () => {
      const cabinet = { id: 'c1' } as KitchenCabinet;
      wallsSig.set([makeWall({ cabinets: [cabinet] })]);

      service.cabinetPositions();

      const passedCabinets = geometryServiceSpy.calculateCabinetPositions.calls.mostRecent().args[0];
      expect(passedCabinets).toEqual([cabinet]);
    });

    it('szafki ze ściany są przekazywane do calculateUsedWidth', () => {
      const cabinet = { id: 'c1' } as KitchenCabinet;
      wallsSig.set([makeWall({ cabinets: [cabinet] })]);

      service.usedWidthBottom();

      const passedCabinets = geometryServiceSpy.calculateUsedWidth.calls.mostRecent().args[0];
      expect(passedCabinets).toEqual([cabinet]);
    });
  });

  describe('agregacje', () => {
    it('totalWidth zwraca maksimum z usedWidthBottom i usedWidthTop', () => {
      geometryServiceSpy.calculateUsedWidth.and.callFake((_cabs, zone) => zone === 'BOTTOM' ? 1200 : 900);

      expect(service.totalWidth()).toBe(1200);
    });

    it('fitsOnWall zwraca true gdy obie strefy mieszczą się w szerokości ściany', () => {
      geometryServiceSpy.calculateUsedWidth.and.returnValue(2000);

      expect(service.fitsOnWall()).toBeTrue();
    });

    it('fitsOnWall zwraca false gdy usedWidthBottom przekracza szerokość ściany', () => {
      geometryServiceSpy.calculateUsedWidth.and.callFake((_cabs, zone) => zone === 'BOTTOM' ? 3500 : 1000);

      expect(service.fitsOnWall()).toBeFalse();
    });

    it('remainingWidthBottom oblicza pozostałą szerokość dla dolnych szafek', () => {
      geometryServiceSpy.calculateUsedWidth.and.callFake((_cabs, zone) => zone === 'BOTTOM' ? 1800 : 0);

      expect(service.remainingWidthBottom()).toBe(1200); // 3000 - 1800
    });

    it('remainingWidthTop oblicza pozostałą szerokość dla górnych szafek', () => {
      geometryServiceSpy.calculateUsedWidth.and.callFake((_cabs, zone) => zone === 'TOP' ? 600 : 0);

      expect(service.remainingWidthTop()).toBe(2400); // 3000 - 600
    });

    it('remainingWidth zwraca minimum z obu stref', () => {
      geometryServiceSpy.calculateUsedWidth.and.callFake((_cabs, zone) => zone === 'BOTTOM' ? 1800 : 600);

      // BOTTOM remaining = 3000-1800 = 1200; TOP remaining = 3000-600 = 2400; min = 1200
      expect(service.remainingWidth()).toBe(1200);
    });
  });

  describe('reaktywność — zmiana aktywnej ściany', () => {
    it('przełączenie selectedWallId aktualizuje remainingWidthBottom', () => {
      const wallA = makeWall({ id: 'w1', widthMm: 3000 });
      const wallB = makeWall({ id: 'w2', widthMm: 2000 });
      wallsSig.set([wallA, wallB]);
      selectedWallIdSig.set('w1');
      geometryServiceSpy.calculateUsedWidth.and.returnValue(1500);

      expect(service.remainingWidthBottom()).toBe(1500); // 3000 - 1500

      selectedWallIdSig.set('w2');

      expect(service.remainingWidthBottom()).toBe(500); // 2000 - 1500
    });

    it('przełączenie selectedWallId aktualizuje cabinetPositions', () => {
      const cabinetA = { id: 'a' } as KitchenCabinet;
      const cabinetB = { id: 'b' } as KitchenCabinet;
      wallsSig.set([
        makeWall({ id: 'w1', cabinets: [cabinetA] }),
        makeWall({ id: 'w2', cabinets: [cabinetB] })
      ]);
      selectedWallIdSig.set('w1');

      service.cabinetPositions();
      expect(geometryServiceSpy.calculateCabinetPositions.calls.mostRecent().args[0]).toEqual([cabinetA]);

      selectedWallIdSig.set('w2');

      service.cabinetPositions();
      expect(geometryServiceSpy.calculateCabinetPositions.calls.mostRecent().args[0]).toEqual([cabinetB]);
    });
  });

  describe('reaktywność — zmiana ustawień projektu', () => {
    it('zmiana fillerWidthMm aktualizuje argumenty calculateUsedWidth', () => {
      service.usedWidthBottom();
      expect(geometryServiceSpy.calculateUsedWidth).toHaveBeenCalledWith([], 'BOTTOM', 50, 'MAIN');

      fillerWidthSig.set(80);

      service.usedWidthBottom();
      expect(geometryServiceSpy.calculateUsedWidth).toHaveBeenCalledWith([], 'BOTTOM', 80, 'MAIN');
    });

    it('zmiana plinthHeightMm aktualizuje settings przekazywane do calculateCabinetPositions', () => {
      service.cabinetPositions();
      expect(geometryServiceSpy.calculateCabinetPositions).toHaveBeenCalledWith(
        [], jasmine.objectContaining({ plinthHeightMm: 100 })
      );

      plinthHeightSig.set(150);

      service.cabinetPositions();
      expect(geometryServiceSpy.calculateCabinetPositions).toHaveBeenCalledWith(
        [], jasmine.objectContaining({ plinthHeightMm: 150 })
      );
    });
  });

  describe('brak aktywnej ściany', () => {
    beforeEach(() => {
      wallsSig.set([]);
      selectedWallIdSig.set(null);
    });

    it('fitsOnWall zwraca true', () => {
      expect(service.fitsOnWall()).toBeTrue();
    });

    it('remainingWidth zwraca 0', () => {
      expect(service.remainingWidth()).toBe(0);
    });

    it('remainingWidthBottom zwraca 0', () => {
      expect(service.remainingWidthBottom()).toBe(0);
    });

    it('remainingWidthTop zwraca 0', () => {
      expect(service.remainingWidthTop()).toBe(0);
    });
  });
});
