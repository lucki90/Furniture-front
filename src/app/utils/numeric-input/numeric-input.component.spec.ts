import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgControl, ReactiveFormsModule } from '@angular/forms';
import { MaxLengthForNumberDirective } from '../directives/maxLengthForNumberDirective';
import { NumericInputComponent } from './numeric-input.component';

describe('NumericInputComponent', () => {
  let component: NumericInputComponent;
  let fixture: ComponentFixture<NumericInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NumericInputComponent, MaxLengthForNumberDirective],
      imports: [ReactiveFormsModule],
      providers: [
        {
          provide: NgControl,
          useValue: {
            control: {
              setValue: () => undefined
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NumericInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
