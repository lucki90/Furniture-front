import {ComponentFixture, TestBed} from '@angular/core/testing';

import {CabinetFormComponent} from './cabinet-form.component';

describe('CabinetFormComponent', () => {
  let component: CabinetFormComponent;
  let fixture: ComponentFixture<CabinetFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CabinetFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CabinetFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
