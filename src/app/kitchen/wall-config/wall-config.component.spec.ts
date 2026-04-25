import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WallConfigComponent } from './wall-config.component';
import { KitchenStateService } from '../service/kitchen-state.service';
import { CountertopConfig, PlinthConfig, WallWithCabinets } from '../model/kitchen-state.model';

describe('WallConfigComponent', () => {
  let component: WallConfigComponent;
  let fixture: ComponentFixture<WallConfigComponent>;
  let stateService: KitchenStateServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WallConfigComponent],
      providers: [{ provide: KitchenStateService, useClass: KitchenStateServiceStub }]
    }).compileComponents();

    fixture = TestBed.createComponent(WallConfigComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(KitchenStateService) as unknown as KitchenStateServiceStub;
    fixture.detectChanges();
  });

  it('renders island-only controls for island wall', () => {
    expect(fixture.nativeElement.textContent).toContain('Głębokość wyspy (mm)');
    expect(fixture.nativeElement.textContent).toContain('Nawis front (mm)');
  });

  it('hides left panel control when island is adjacent to left wall', () => {
    stateService.selectedWallSignal.set({
      ...stateService.selectedWallSignal()!,
      adjacentToWall: 'LEFT'
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Lewy panel boczny');
    expect(fixture.nativeElement.textContent).toContain('Prawy panel boczny');
  });

  it('adjacentToWall setter clears conflicting wall-level options', () => {
    component.adjacentToWall = 'BACK';

    expect(stateService.lastWallPatch).toEqual(jasmine.objectContaining({
      adjacentToWall: 'BACK',
      backBlendaEnabled: false
    }));
  });
});

class KitchenStateServiceStub {
  readonly selectedWallSignal = signal<WallWithCabinets | null>({
    id: 'wall-1',
    type: 'ISLAND',
    widthMm: 2400,
    heightMm: 2600,
    islandDepthMm: 900,
    adjacentToWall: 'NONE',
    leftSidePanelEnabled: true,
    rightSidePanelEnabled: true,
    backBlendaEnabled: true,
    cabinets: [],
    countertopConfig: {
      enabled: true,
      materialType: 'LAMINATE',
      thicknessMm: 38,
      manualDepthMm: 900,
      frontOverhangMm: 30,
      backOverhangMm: 30,
      sideOverhangExtraMm: 5,
      jointType: 'ALUMINUM_STRIP',
      edgeType: 'ABS_EDGE'
    },
    plinthConfig: {
      enabled: true,
      feetType: 'FEET_100',
      materialType: 'PVC'
    }
  });
  readonly selectedWall = this.selectedWallSignal;
  readonly selectedWallId = signal<string | null>('wall-1');
  readonly upperFillerHeightMm = signal(100);
  lastWallPatch: Partial<WallWithCabinets> | null = null;

  getCountertopConfig(): CountertopConfig | undefined {
    return this.selectedWallSignal()?.countertopConfig;
  }

  getPlinthConfig(): PlinthConfig | undefined {
    return this.selectedWallSignal()?.plinthConfig;
  }

  updateCountertopConfig(_: string, config: CountertopConfig) {
    this.selectedWallSignal.update(wall => wall ? ({ ...wall, countertopConfig: config }) : wall);
  }

  updatePlinthConfig(_: string, config: PlinthConfig) {
    this.selectedWallSignal.update(wall => wall ? ({ ...wall, plinthConfig: config }) : wall);
  }

  updateProjectSettings() {}

  updateWallState(_: string, patch: Partial<WallWithCabinets>) {
    this.lastWallPatch = patch;
    this.selectedWallSignal.update(wall => wall ? ({ ...wall, ...patch }) : wall);
  }
}
