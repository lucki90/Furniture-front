import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CabinetResultComponent } from './cabinet-result.component';

describe('CabinetResultComponent', () => {
  let component: CabinetResultComponent;
  let fixture: ComponentFixture<CabinetResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CabinetResultComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CabinetResultComponent);
    component = fixture.componentInstance;
    component.result = {
      summaryCosts: 0,
      boardTotalCost: 0,
      componentTotalCost: 0,
      jobTotalCost: 0,
      boards: []
    } as never;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
