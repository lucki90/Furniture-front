import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FloorPlanWallGroupComponent } from './floor-plan-wall-group.component';
import { WallPosition } from './floor-plan-layout.builder';
import { WallWithCabinets } from '../model/kitchen-state.model';

@Component({
  standalone: true,
  imports: [FloorPlanWallGroupComponent],
  template: `
    <svg>
      <g
        appFloorPlanWallGroup
        [wallPosition]="wallPosition"
        [cabinets]="cabinets"
        [countertops]="countertops"
        [selected]="selected"
        [canRemoveWall]="canRemoveWall"
        [editingCabinetId]="editingCabinetId"
        [showCountertop]="showCountertop"
        [showUpperCabinets]="showUpperCabinets"
        (wallSelected)="selectedWallId = $event"
        (wallRemoved)="removedWallId = $event">
      </g>
    </svg>
  `
})
class TestHostComponent {
  wallPosition!: WallPosition;
  cabinets = [
    {
      cabinetId: 'cab-1',
      name: 'Szafka dolna',
      x: 40,
      y: 70,
      width: 50,
      depth: 25,
      zone: 'BOTTOM' as const,
      isCorner: false,
      isFreestanding: false
    },
    {
      cabinetId: 'cab-2',
      name: 'Szafka górna',
      x: 95,
      y: 65,
      width: 40,
      depth: 20,
      zone: 'TOP' as const,
      isCorner: false,
      isFreestanding: false
    }
  ];
  countertops = [{
    x: 40,
    y: 60,
    width: 95,
    depth: 8,
    lengthMm: 1900,
    depthMm: 600,
    lengthLabelX: 87.5,
    lengthLabelY: 57,
    isHorizontal: true
  }];
  selected = false;
  canRemoveWall = false;
  editingCabinetId: string | null = null;
  showCountertop = true;
  showUpperCabinets = true;
  selectedWallId: string | null = null;
  removedWallId: string | null = null;
}

describe('FloorPlanWallGroupComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;

    const wall = {
      id: 'wall-1',
      label: 'Ściana główna',
      type: 'MAIN',
      widthMm: 3000,
      heightMm: 2400,
      cabinets: [{ id: 'cab-1' }, { id: 'cab-2' }]
    } as unknown as WallWithCabinets;

    host.wallPosition = {
      wall,
      x: 30,
      y: 80,
      width: 120,
      height: 10,
      scale: 0.04,
      rotation: 0,
      isHorizontal: true,
      labelX: 90,
      labelY: 85
    };
  });

  it('renders wall, cabinets and countertop', () => {
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.cabinet-rect').length).toBe(2);
    expect(root.querySelector('.countertop-rect')).not.toBeNull();
    expect(root.querySelector('.wall-label')?.textContent).toContain('G');
    expect(root.querySelector('.cabinet-count')?.textContent).toContain('2');
  });

  it('emits selection and removal events', () => {
    host.selected = true;
    host.canRemoveWall = true;
    fixture.detectChanges();

    const wallGroup = fixture.nativeElement.querySelector('.wall-group') as SVGGElement;
    wallGroup.dispatchEvent(new Event('click'));
    fixture.detectChanges();
    expect(host.selectedWallId).toBe('wall-1');

    const removeButton = fixture.nativeElement.querySelector('.remove-btn') as SVGGElement;
    removeButton.dispatchEvent(new Event('click'));
    fixture.detectChanges();
    expect(host.removedWallId).toBe('wall-1');
  });

  it('hides upper cabinets when the toggle is disabled', () => {
    host.showUpperCabinets = false;
    fixture.detectChanges();

    const cabinets = fixture.nativeElement.querySelectorAll('.cabinet-rect') as NodeListOf<SVGRectElement>;
    expect(cabinets[1].style.display).toBe('none');
  });
});
