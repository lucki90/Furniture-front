import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FloorPlanArc } from './floor-plan-door-arcs';
import { FloorPlanOverlayLayerComponent } from './floor-plan-overlay-layer.component';

@Component({
  standalone: true,
  imports: [FloorPlanOverlayLayerComponent],
  template: `
    <svg>
      <g
        appFloorPlanOverlayLayer
        [showCountertop]="showCountertop"
        [showDoorArcs]="showDoorArcs"
        [cornerCountertops]="cornerCountertops"
        [doorArcs]="doorArcs">
      </g>
    </svg>
  `
})
class TestHostComponent {
  showCountertop = true;
  showDoorArcs = false;
  cornerCountertops = [{
    x: 20,
    y: 30,
    sizePx: 24,
    miterX1: 20,
    miterY1: 54,
    miterX2: 44,
    miterY2: 30,
    label: '600×600mm'
  }];
  doorArcs: FloorPlanArc[] = [{
    cabinetId: 'cab-1',
    pathD: 'M 10 10 A 20 20 0 0 1 30 30',
    hasCollision: true,
    bboxX: 10,
    bboxY: 10,
    bboxW: 20,
    bboxH: 20
  }];
}

describe('FloorPlanOverlayLayerComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
  });

  it('renders corner countertop overlays', () => {
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.corner-countertop-rect')).not.toBeNull();
    expect(root.querySelector('.corner-countertop-label')?.textContent).toContain('45°');
  });

  it('renders door arcs when enabled', () => {
    host.showDoorArcs = true;
    fixture.detectChanges();

    const arc = fixture.nativeElement.querySelector('.door-arc') as SVGPathElement;
    expect(arc).not.toBeNull();
    expect(arc.classList.contains('arc-collision')).toBeTrue();
  });

  it('always renders the legend', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.legend-item')?.textContent).toContain('G-główna');
  });
});
