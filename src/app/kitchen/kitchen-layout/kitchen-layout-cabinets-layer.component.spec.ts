import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KitchenLayoutCabinetsLayerComponent } from './kitchen-layout-cabinets-layer.component';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { VisualCabinetPosition } from './kitchen-layout-view-model.builder';

@Component({
  standalone: true,
  imports: [KitchenLayoutCabinetsLayerComponent],
  template: `
    <svg>
      <g
        appKitchenLayoutCabinetsLayer
        [positions]="positions"
        [showUpperCabinets]="showUpperCabinets"
        [showCabinetLabels]="showCabinetLabels"
        [editingCabinetId]="editingCabinetId">
      </g>
    </svg>
  `
})
class TestHostComponent {
  positions: VisualCabinetPosition[] = [];
  showUpperCabinets = true;
  showCabinetLabels = true;
  editingCabinetId: string | null = null;
}

describe('KitchenLayoutCabinetsLayerComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  const basePosition: VisualCabinetPosition = {
    cabinetId: 'cab-1',
    name: 'Szafka',
    type: KitchenCabinetType.BASE_ONE_DOOR,
    zone: 'BOTTOM',
    x: 0,
    y: 0,
    width: 600,
    height: 720,
    depth: 560,
    displayX: 10,
    displayY: 40,
    displayWidth: 120,
    displayHeight: 92,
    bodyHeight: 80,
    feetHeight: 12,
    fronts: [
      { type: 'DOOR_LEFT', x: 12, y: 42, width: 56, height: 76 },
      { type: 'DRAWER', x: 70, y: 42, width: 56, height: 20 }
    ],
    handles: [{ type: 'BAR', x1: 20, y1: 60, x2: 40, y2: 60 }],
    feet: [{ x: 18, y1: 120, y2: 132 }],
    isCorner: true,
    isOverflow: false,
    isFreestandingAppliance: false,
    leftEnclosureDisplayWidth: 6,
    rightEnclosureDisplayWidth: 8,
    leftEnclosureType: 'SIDE_PLATE_WITH_PLINTH',
    rightEnclosureType: 'SIDE_PLATE_TO_FLOOR',
    depthDiff: 10,
    heightDiff: 80,
    ovenSeparatorDisplayY: 88
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
  });

  it('renders cabinet body, enclosures and labels', () => {
    host.positions = [basePosition];
    host.editingCabinetId = 'cab-1';
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.cabinet-group').length).toBe(1);
    expect(root.querySelector('.cabinet-group')?.classList.contains('editing')).toBeTrue();
    expect(root.querySelectorAll('.enclosure-plate').length).toBe(2);
    expect(root.querySelector('.cabinet-label-text')?.textContent).toContain('Szafka');
    expect(root.querySelector('.corner-icon-text')?.textContent).toContain('⭔');
  });

  it('hides top cabinets when upper cabinets are disabled', () => {
    host.positions = [{ ...basePosition, cabinetId: 'cab-top', zone: 'TOP', type: KitchenCabinetType.UPPER_ONE_DOOR }];
    host.showUpperCabinets = false;
    fixture.detectChanges();

    const group = fixture.nativeElement.querySelector('.cabinet-group') as SVGGElement;
    expect(group.style.display).toBe('none');
  });

  it('renders dimension indicators and handle geometry', () => {
    host.positions = [basePosition];
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.handle-line').length).toBe(1);
    expect(root.querySelectorAll('.foot-line').length).toBe(1);
    expect(root.querySelectorAll('.dimension-indicator').length).toBe(2);
    expect(root.textContent).toContain('h+80');
    expect(root.textContent).toContain('d+10');
  });
});
