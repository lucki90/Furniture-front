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

  it('powinien utworzyć komponent', () => {
    expect(component).toBeTruthy();
  });

  it('powinien pokazać fallback w chipie, gdy wartość jest null', () => {
    component.writeValue(null);

    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector('.numeric-input-value');
    expect(chip?.textContent?.trim()).toBe('-');
  });

  it('nie powinien emitować zmiany formularza po programatycznym ustawieniu wartości', () => {
    const onChange = jasmine.createSpy('onChange');
    const valueChange = jasmine.createSpy('valueChange');
    component.registerOnChange(onChange);
    component.valueChange.subscribe(valueChange);

    component.value = 42;
    component.writeValue(55);

    expect(component.value).toBe(55);
    expect(onChange).not.toHaveBeenCalled();
    expect(valueChange).not.toHaveBeenCalled();
  });

  it('powinien emitować zmianę formularza tylko po zmianie użytkownika', () => {
    const onChange = jasmine.createSpy('onChange');
    const onTouched = jasmine.createSpy('onTouched');
    const valueChange = jasmine.createSpy('valueChange');
    component.registerOnChange(onChange);
    component.registerOnTouched(onTouched);
    component.valueChange.subscribe(valueChange);

    const input = fixture.nativeElement.querySelector('.numeric-input-field') as HTMLInputElement;
    input.value = '37';
    input.dispatchEvent(new Event('input'));

    expect(component.value).toBe(37);
    expect(onChange).toHaveBeenCalledOnceWith(37);
    expect(valueChange).toHaveBeenCalledOnceWith(37);
    expect(onTouched).toHaveBeenCalledTimes(1);
  });

  it('powinien przekazać null, gdy użytkownik wyczyści pole liczbowe', () => {
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);

    const input = fixture.nativeElement.querySelector('.numeric-input-field') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input'));

    expect(component.value).toBeNull();
    expect(component.isValid()).toBeFalse();
    expect(onChange).toHaveBeenCalledOnceWith(null);
  });

  it('nie powinien emitować zmian użytkownika, gdy kontrolka jest disabled', () => {
    const onChange = jasmine.createSpy('onChange');
    const valueChange = jasmine.createSpy('valueChange');
    component.registerOnChange(onChange);
    component.valueChange.subscribe(valueChange);
    component.setDisabledState(true);

    const input = fixture.nativeElement.querySelector('.numeric-input-field') as HTMLInputElement;
    input.value = '44';
    input.dispatchEvent(new Event('input'));

    expect(component.value).toBe(0);
    expect(onChange).not.toHaveBeenCalled();
    expect(valueChange).not.toHaveBeenCalled();
  });
});
