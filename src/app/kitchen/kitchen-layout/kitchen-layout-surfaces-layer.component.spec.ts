import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  KitchenLayoutSurfacesLayerComponent,
  LayoutRect
} from './kitchen-layout-surfaces-layer.component';

@Component({
  standalone: true,
  imports: [KitchenLayoutSurfacesLayerComponent],
  template: `
    <svg>
      <g
        appKitchenLayoutSurfacesLayer
        [showCountertop]="showCountertop"
        [showUpperCabinets]="showUpperCabinets"
        [counterZoneY]="counterZoneY"
        [counterZoneHeight]="counterZoneHeight"
        [countertopZoneRects]="countertopZoneRects"
        [countertopDimensions]="countertopDimensions"
        [countertopSegmentLabels]="countertopSegmentLabels"
        [fillerPosition]="fillerPosition"
        [fillerJoinXPositions]="fillerJoinXPositions"
        [plinthSegments]="plinthSegments"
        [plinthJoinXPositions]="plinthJoinXPositions"
        [plinthPosition]="plinthPosition">
      </g>
    </svg>
  `
})
class TestHostComponent {
  showCountertop = true;
  showUpperCabinets = true;
  counterZoneY = 20;
  counterZoneHeight = 8;
  countertopZoneRects = [{ x: 0, width: 120 }, { x: 140, width: 80 }];
  countertopDimensions = { lengthMm: 2200, depthMm: 600 };
  countertopSegmentLabels = [{ x: 60, lengthMm: 1200, depthMm: 600 }];
  fillerPosition: LayoutRect | null = { x: 10, y: 0, width: 100, height: 6 };
  fillerJoinXPositions = [70];
  plinthSegments: LayoutRect[] = [{ x: 12, y: 150, width: 180, height: 10 }];
  plinthJoinXPositions = [95];
  plinthPosition: LayoutRect | null = { x: 12, y: 150, width: 180, height: 10 };
}

describe('KitchenLayoutSurfacesLayerComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
  });

  it('renders countertop segments and labels', () => {
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.countertop-rect').length).toBe(2);
    expect(root.querySelector('.countertop-dimension-label')?.textContent).toContain('1200');
  });

  it('renders filler and plinth join markers', () => {
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.filler-rect')).not.toBeNull();
    expect(root.querySelector('.plinth-rect')).not.toBeNull();
    expect(root.querySelectorAll('.board-join-line').length).toBe(2);
  });

  it('hides optional layers when toggles are off', () => {
    host.showCountertop = false;
    host.showUpperCabinets = false;
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.countertop-rect')).toBeNull();
    expect(root.querySelector('.filler-rect')).toBeNull();
    expect(root.querySelector('.plinth-rect')).not.toBeNull();
  });
});
