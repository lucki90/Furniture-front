import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AloneCabinetComponent } from './alone-cabinet.component';

describe('AloneCabinetComponent', () => {
  let component: AloneCabinetComponent;
  let fixture: ComponentFixture<AloneCabinetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AloneCabinetComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(AloneCabinetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
