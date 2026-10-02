import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FloorPlanArc } from './floor-plan-door-arcs';
import { CornerCountertopOverlay, FloorPlanOverlayLayerComponent } from './floor-plan-overlay-layer.component';

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
  cornerCountertops: CornerCountertopOverlay[] = [{
    x: 20,
    y: 30,
    widthPx: 24,
    depthPx: 24,
    jointPoints: '20,54 44,30',
    jointType: 'MITER_45',
    jointLabel: '45°',
    label: '600×600mm'
  }];
  doorArcs: FloorPlanArc[] = [{
    id: 'cab-1-door',
    cabinetId: 'cab-1',
    kind: 'SINGLE_DOOR',
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
    expect(root.querySelector('.corner-miter-line')?.getAttribute('points')).toBe('20,54 44,30');
  });

  it('rysuje listwę aluminiową grubszą, pełną linią', () => {
    host.cornerCountertops = [{ ...host.cornerCountertops[0], jointType: 'ALUMINUM_STRIP', jointLabel: 'listwa' }];
    fixture.detectChanges();

    const line = fixture.nativeElement.querySelector('.corner-miter-line') as SVGLineElement;
    expect(line.classList.contains('corner-joint-line--strip')).toBeTrue();
    expect(fixture.nativeElement.querySelector('.corner-countertop-label')?.textContent).toContain('listwa');
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
