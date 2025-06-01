import {ComponentFixture, TestBed} from '@angular/core/testing';

import {MultiCabinetComponent} from './multi-cabinet.component';

describe('MultiCabinetComponent', () => {
  let component: MultiCabinetComponent;
  let fixture: ComponentFixture<MultiCabinetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MultiCabinetComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(MultiCabinetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
