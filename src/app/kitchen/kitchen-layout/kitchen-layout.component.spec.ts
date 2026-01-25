import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KitchenLayoutComponent } from './kitchen-layout.component';

describe('KitchenLayoutComponent', () => {
  let component: KitchenLayoutComponent;
  let fixture: ComponentFixture<KitchenLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitchenLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KitchenLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
