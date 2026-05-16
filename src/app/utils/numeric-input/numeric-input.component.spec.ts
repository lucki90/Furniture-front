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

  it('shows fallback chip value when value is null', () => {
    component.writeValue(null as unknown as number);

    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector('.numeric-input-value');
    expect(chip?.textContent?.trim()).toBe('-');
  });
});
