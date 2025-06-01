import {Component, EventEmitter, forwardRef, Input, OnInit, Output} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

@Component({
  selector: 'app-numeric-input',
  templateUrl: './numeric-input.component.html',
  styleUrls: ['./numeric-input.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NumericInputComponent),
      multi: true
    }
  ]
})
export class NumericInputComponent implements ControlValueAccessor, OnInit {
  @Input() id: string = '';
  @Input() label: string = '';
  @Input() min: number = 0;
  @Input() max: number = 100;
  @Input() step: number = 1;
  @Input() errorMessage: string = '';
  @Input() isDisabled: boolean = false; // Dodajemy nowy Input

  @Output() valueChange = new EventEmitter<number>();

  private _value: number = 0;
  disabled: boolean = false;
  onChange: any = () => {
  };
  onTouch: any = () => {
  };

  ngOnInit() {
    if (!this.id) {
      this.id = `numeric-input-${Math.random().toString(36).slice(2, 11)}`;
    }
  }

  @Input()
  set value(val: number) {
    if (!this.isDisabled) { // Sprawdzamy czy kontrolka nie jest wyłączona
      this._value = val;
      this.onChange(val);
      this.valueChange.emit(val);
    }
  }

  get value(): number {
    return this._value;
  }

  writeValue(value: number): void {
    this._value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInputChange(value: number): void {
    if (!this.isDisabled) { // Sprawdzamy czy kontrolka nie jest wyłączona
      this._value = value;
      this.onChange(value);
      this.onTouch();
    }
  }

  isValid(): boolean {
    if (this._value === null || this._value === undefined) {
      return false;
    }
    return this._value >= this.min && this._value <= this.max;
  }

  get hasError(): boolean {
    return !this.isValid() && !this.isDisabled; // Nie pokazujemy błędu dla wyłączonej kontrolki
  }

}
