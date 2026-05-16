import { Component, EventEmitter, forwardRef, Input, OnInit, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

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
  ],
  standalone: false
})
export class NumericInputComponent implements ControlValueAccessor, OnInit {
  @Input() id: string = '';
  @Input() label: string = '';
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Input() errorMessage: string = '';
  @Input() externalErrorMessage: string | null = null;

  @Output() valueChange = new EventEmitter<number>();
  _isDisabled = false;
  private _value: number = 0;

  onChange: (value: number) => void = () => undefined;
  onTouch: () => void = () => undefined;

  ngOnInit(): void {
    if (!this.id) {
      this.id = `numeric-input-${Math.random().toString(36).slice(2, 11)}`;
    }
  }

  @Input()
  // TODO(CODEX): Komponent miesza kilka kanałów zmiany stanu naraz (`@Input value`, CVA, `valueChange`,
  // input number i range). To zwiększa ryzyko zapętleń i rozjazdów wartości. Jeśli ma być kontrolką
  // formularzową, lepiej oprzeć go wyłącznie o poprawny ControlValueAccessor i jeden spójny przepływ danych.
  set value(val: number) {
    if (!this._isDisabled) {
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

  onInputChange(rawEvent: Event): void {
    const inputElement = rawEvent.target as HTMLInputElement;
    const value = inputElement?.valueAsNumber;

    if (!this._isDisabled && !Number.isNaN(value)) {
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
    return !!this.externalErrorMessage || (!this.isValid() && !this._isDisabled);
  }

  get displayedErrorMessage(): string {
    return this.externalErrorMessage || this.errorMessage;
  }

  setDisabledState(isDisabled: boolean): void {
    this._isDisabled = isDisabled;
  }
}
