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

  @Output() valueChange = new EventEmitter<number | null>();

  private _isDisabled = false;
  private _value: number | null = 0;

  private onChange: (value: number | null) => void = () => undefined;
  private onTouch: () => void = () => undefined;

  ngOnInit(): void {
    if (!this.id) {
      this.id = `numeric-input-${Math.random().toString(36).slice(2, 11)}`;
    }
  }

  @Input()
  set value(val: number | null) {
    if (!this._isDisabled) {
      this.setInternalValue(val);
    }
  }

  get value(): number | null {
    return this._value;
  }

  get rangeValue(): number {
    return this._value ?? this.min;
  }

  get isDisabled(): boolean {
    return this._isDisabled;
  }

  writeValue(value: number | null): void {
    this.setInternalValue(value);
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._isDisabled = isDisabled;
  }

  onInputChange(rawEvent: Event): void {
    const inputElement = rawEvent.target as HTMLInputElement;
    const value = Number.isNaN(inputElement?.valueAsNumber) ? null : inputElement.valueAsNumber;

    this.commitUserValue(value);
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

  private setInternalValue(value: number | null): void {
    this._value = value;
  }

  private commitUserValue(value: number | null): void {
    if (this._isDisabled) {
      return;
    }

    this.setInternalValue(value);
    this.onChange(value);
    this.valueChange.emit(value);
    this.onTouch();
  }
}
