import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { CabinetPosition, WallWithCabinets } from '../model/kitchen-state.model';
import { CabinetSide } from '../model/kitchen-project.model';
import { KitchenStateService } from '../service/kitchen-state.service';
import { KitchenLayoutComponent } from './kitchen-layout.component';

describe('KitchenLayoutComponent', () => {
  let component: KitchenLayoutComponent;
  let fixture: ComponentFixture<KitchenLayoutComponent>;
  let stateService: KitchenStateServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitchenLayoutComponent],
      providers: [{ provide: KitchenStateService, useClass: KitchenStateServiceStub }]
    }).compileComponents();

    fixture = TestBed.createComponent(KitchenLayoutComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(KitchenStateService) as unknown as KitchenStateServiceStub;
    fixture.detectChanges();
  });

  it('should compute 405mm countertop length for a cabinet run flush to the wall edge', () => {
    stateService.setCabinetRun(0);
    fixture.detectChanges();

    expect(component.countertopDimensions()?.lengthMm).toBe(405);
    expect(component.countertopSegmentLabels()[0].lengthMm).toBe(405);
    expect(component.countertopZoneRects()[0].x).toBe(0);
  });

  it('should compute 410mm countertop length when the cabinet run is offset from the wall edge', () => {
    stateService.setCabinetRun(100);
    fixture.detectChanges();

    expect(component.countertopDimensions()?.lengthMm).toBe(410);
    expect(component.countertopSegmentLabels()[0].lengthMm).toBe(410);
    expect(component.countertopZoneRects()[0].x).toBeCloseTo(100 * component.scaleFactor() - 5 * component.scaleFactor(), 3);
  });
});

class KitchenStateServiceStub {
  readonly showCountertop = signal(true);
  readonly showUpperCabinets = signal(true);
  readonly visibleIslandSide = signal<CabinetSide>('FRONT');
  readonly selectedWallId = signal<string | null>('wall-1');
  readonly plinthHeightMm = signal(100);
  readonly fillerWidthMm = signal(50);
  readonly countertopThicknessMm = signal(38);
  readonly upperFillerHeightMm = signal(100);
  readonly fitsOnWall = signal(true);
  readonly totalWidth = signal(400);
  readonly remainingWidth = signal(2600);
  readonly usedWidthBottom = signal(400);
  readonly usedWidthTop = signal(0);
  readonly remainingWidthBottom = signal(2600);
  readonly remainingWidthTop = signal(3000);

  private readonly cabinet = {
    id: 'base-1',
    type: KitchenCabinetType.BASE_ONE_DOOR,
    width: 400,
    depth: 560,
    height: 720,
    positionY: 100,
    openingType: 'LEFT',
    shelfQuantity: 1
  } as any;

  private readonly selectedWallSignal = signal<WallWithCabinets>(this.buildWall());
  private readonly cabinetPositionsSignal = signal<CabinetPosition[]>([
    { cabinetId: 'base-1', x: 0, y: 100, width: 400, height: 720 }
  ]);

  readonly selectedWall = this.selectedWallSignal.asReadonly();
  readonly walls = computed(() => [this.selectedWallSignal()]);
  readonly cabinets = computed(() => this.selectedWallSignal().cabinets);
  readonly cabinetPositions = this.cabinetPositionsSignal.asReadonly();
  readonly wall = computed(() => ({
    length: this.selectedWallSignal().widthMm,
    height: this.selectedWallSignal().heightMm
  }));

  setCabinetRun(startX: number): void {
    this.cabinetPositionsSignal.set([{ cabinetId: 'base-1', x: startX, y: 100, width: 400, height: 720 }]);
  }

  getWallLabel(): string {
    return 'Sciana glowna';
  }

  private buildWall(): WallWithCabinets {
    return {
      id: 'wall-1',
      type: 'MAIN',
      widthMm: 3000,
      heightMm: 2600,
      cabinets: [this.cabinet],
      countertopConfig: {
        enabled: true,
        manualDepthMm: 600,
        sideOverhangExtraMm: 5,
        thicknessMm: 38
      }
    };
  }
}
