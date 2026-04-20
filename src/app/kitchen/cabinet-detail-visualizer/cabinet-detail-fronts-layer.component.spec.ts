import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CabinetDetailFrontsLayerComponent } from './cabinet-detail-fronts-layer.component';
import { FrontElement } from '../cabinet-form/model/cabinet-visual-elements.model';
import { CabinetDetailGeometry } from './cabinet-detail-visualizer.utils';

@Component({
  standalone: true,
  imports: [CabinetDetailFrontsLayerComponent],
  template: `
    <svg xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="frontGradient"></linearGradient>
        <filter id="dropShadow"></filter>
      </defs>
      <app-cabinet-detail-fronts-layer
        [fronts]="fronts"
        [geometry]="geometry">
      </app-cabinet-detail-fronts-layer>
    </svg>
  `
})
class TestHostComponent {
  fronts: FrontElement[] = [];
  geometry!: CabinetDetailGeometry;
}

describe('CabinetDetailFrontsLayerComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  const geometry: CabinetDetailGeometry = {
    scale: 0.3,
    svgWidth: 200,
    svgHeight: 250,
    bodyX: 10,
    bodyY: 21.4,
    bodyWidth: 180,
    bodyHeight: 582,
    bodyHeightScaled: 174.6,
    baseY: 196,
    baseHeight: 100,
    baseHeightScaled: 30,
    countertopHeight: 38,
    countertopHeightScaled: 11.4,
    plinthSetback: 12
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
  });

  it('renders front rectangles, hinges and handle path for door fronts', () => {
    host.fronts = [{
      type: 'DOOR_SINGLE',
      width: 280,
      height: 576,
      positionX: 3,
      positionY: 3,
      hingesSide: 'LEFT',
      handle: {
        type: 'BAR',
        length: 128,
        position: 'SIDE_RIGHT',
        orientation: 'VERTICAL',
        offsetFromEdge: 30
      }
    }];
    host.geometry = geometry;

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.front-rect').length).toBe(1);
    expect(element.querySelectorAll('.hinge').length).toBe(3);
    expect(element.querySelectorAll('.handle-bar').length).toBe(1);
  });

  it('renders knob and drawer separator for drawer fronts', () => {
    host.fronts = [{
      type: 'DRAWER',
      width: 594,
      height: 120,
      positionX: 3,
      positionY: 3,
      handle: {
        type: 'KNOB',
        position: 'MIDDLE',
        orientation: 'HORIZONTAL',
        offsetFromEdge: 24
      }
    }];
    host.geometry = geometry;

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.handle-knob').length).toBe(1);
    expect(element.querySelectorAll('.drawer-line').length).toBe(1);
  });
});
