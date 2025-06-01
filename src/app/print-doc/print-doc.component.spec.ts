import {ComponentFixture, TestBed} from '@angular/core/testing';

import {PrintDocComponent} from './print-doc.component';

describe('PrintDocComponent', () => {
  let component: PrintDocComponent;
  let fixture: ComponentFixture<PrintDocComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PrintDocComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PrintDocComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
