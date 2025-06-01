import {ComponentFixture, TestBed} from '@angular/core/testing';

import {CabinetVisualizationComponent} from './cabinet-visualization.component';

describe('CabinetVisualizationComponent', () => {
  let component: CabinetVisualizationComponent;
  let fixture: ComponentFixture<CabinetVisualizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CabinetVisualizationComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CabinetVisualizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
