import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NumericInputComponent } from './numeric-input.component';
import { ReactiveFormsModule } from '@angular/forms'; // 👈 to dodaj

describe('NumericInputComponent', () => {
  let component: NumericInputComponent;
  let fixture: ComponentFixture<NumericInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NumericInputComponent],
      imports: [ReactiveFormsModule], // 👈 to dodaj
    }).compileComponents();

    fixture = TestBed.createComponent(NumericInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
