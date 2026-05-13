import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KitchenFloorPlanComponent } from './kitchen-floor-plan.component';
import { KitchenStateService } from '../service/kitchen-state.service';
import { MultiWallCalculateResponse } from '../model/kitchen-project.model';
import { WallWithCabinets } from '../model/kitchen-state.model';

describe('KitchenFloorPlanComponent', () => {
  let fixture: ComponentFixture<KitchenFloorPlanComponent>;
  let component: KitchenFloorPlanComponent;
  let stateService: KitchenStateServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitchenFloorPlanComponent],
      providers: [
        { provide: KitchenStateService, useClass: KitchenStateServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KitchenFloorPlanComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(KitchenStateService) as unknown as KitchenStateServiceStub;
  });

  it('should not render corner overlays when there is no project result', () => {
    component.projectResult = null;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.corner-countertop-rect').length).toBe(0);
  });

  it('should render two corner overlays from backend cornerCountertops result', () => {
    component.projectResult = {
      walls: [],
      wallCount: 3,
      totalCabinetCount: 0,
      allFit: true,
      totalBoardCost: 0,
      totalComponentCost: 0,
      totalWasteCost: 0,
      totalJobCost: 0,
      totalProjectCost: 0,
      cornerCountertops: [
        {
          wallAIndex: 0,
          wallBIndex: 1,
          cornerWidthMm: 600,
          cornerDepthMm: 600,
          thicknessMm: 38,
          jointType: 'MITER_JOINT',
          materialCost: 120,
          jointCost: 15,
          totalCost: 135,
          pricingComplete: true
        },
        {
          wallAIndex: 0,
          wallBIndex: 2,
          cornerWidthMm: 650,
          cornerDepthMm: 600,
          thicknessMm: 38,
          jointType: 'MITER_JOINT',
          materialCost: 130,
          jointCost: 20,
          totalCost: 150,
          pricingComplete: true
        }
      ]
    } as MultiWallCalculateResponse;

    fixture.detectChanges();

    const overlays = fixture.nativeElement.querySelectorAll('.corner-countertop-rect');
    expect(overlays.length).toBe(2);
  });

  it('should keep rendering a single corner overlay for the one-corner scenario', () => {
    component.projectResult = {
      walls: [],
      wallCount: 2,
      totalCabinetCount: 0,
      allFit: true,
      totalBoardCost: 0,
      totalComponentCost: 0,
      totalWasteCost: 0,
      totalJobCost: 0,
      totalProjectCost: 0,
      cornerCountertops: [
        {
          wallAIndex: 0,
          wallBIndex: 1,
          cornerWidthMm: 600,
          cornerDepthMm: 600,
          thicknessMm: 38,
          jointType: 'MITER_JOINT',
          materialCost: 120,
          jointCost: 15,
          totalCost: 135,
          pricingComplete: true
        }
      ]
    } as MultiWallCalculateResponse;

    fixture.detectChanges();

    const overlays = fixture.nativeElement.querySelectorAll('.corner-countertop-rect');
    expect(overlays.length).toBe(1);
    expect(fixture.nativeElement.querySelector('.corner-countertop-label')?.textContent).toContain('45');
    expect(fixture.nativeElement.querySelector('.corner-countertop-rect title')?.textContent).toContain('600x600');
  });

  it('should show island nudge controls when an island wall exists', () => {
    stateService.walls.set([
      buildWall('main', 'MAIN', 3000),
      buildWall('island', 'ISLAND', 1800)
    ]);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.fp-island-controls')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.fp-nudge-btn').length).toBe(4);
  });

  it('should render a symbolic room outline when room dimensions are provided', () => {
    stateService.currentProjectRoomWidthMm.set(4200);
    stateService.currentProjectRoomDepthMm.set(3100);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.room-outline')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.room-outline-label')?.textContent).toContain('4200 x 3100 mm');
  });
});

class KitchenStateServiceStub {
  readonly walls = signal<WallWithCabinets[]>([
    buildWall('main', 'MAIN', 3000),
    buildWall('left', 'LEFT', 2200),
    buildWall('right', 'RIGHT', 2200)
  ]);
  readonly selectedWallId = signal<string>('main');
  readonly showCountertop = signal(true);
  readonly showUpperCabinets = signal(true);
  readonly plinthHeightMm = signal(100);
  readonly upperFillerHeightMm = signal(100);
  readonly fillerWidthMm = signal(50);
  readonly currentProjectRoomWidthMm = signal<number | null>(null);
  readonly currentProjectRoomDepthMm = signal<number | null>(null);

  selectWall(wallId: string): void {
    this.selectedWallId.set(wallId);
  }

  getWallLabel(type: string): string {
    return type;
  }
}

function buildWall(id: string, type: WallWithCabinets['type'], widthMm: number): WallWithCabinets {
  return {
    id,
    type,
    widthMm,
    heightMm: 2600,
    cabinets: []
  };
}
