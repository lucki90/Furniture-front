import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface DropdownOption<T = unknown> {
  value: T;
  label: string;
}

@Component({
  selector: 'app-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DropdownComponent),
      multi: true
    }
  ],
  standalone: false
})
export class DropdownComponent implements ControlValueAccessor {
  @Input() id: string = '';
  @Input() options: DropdownOption[] = [];
  @Input() label: string = '';
  @Input() errorMessage: string = 'To pole wymaga poprawnej wartości.';
  @Input() externalErrorMessage: string | null = null;
  @Input() visible: boolean = true;
  @Input() translations: { [key: string]: string } = {};

  value: unknown = null;
  disabled = false;

  private onChange: (value: unknown) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngOnInit(): void {
    if (!this.id) {
      this.id = `dropdown-${Math.random().toString(36).slice(2, 11)}`;
    }
  }

  onSelectionChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const selectedIndex = Number(select.value);
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= this.options.length) {
      return;
    }

    this.value = this.options[selectedIndex].value;
    this.onChange(this.value);
    this.onTouched();
  }

  markAsTouched(): void {
    this.onTouched();
  }

  isSelected(optionValue: unknown): boolean {
    return Object.is(optionValue, this.value);
  }

  writeValue(value: unknown): void {
    this.value = value;
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  isValid(): boolean {
    return !(this.value === null || this.value === undefined);
  }

  get hasError(): boolean {
    return !!this.externalErrorMessage || (!this.isValid() && !this.disabled);
  }

  get displayedErrorMessage(): string {
    return this.externalErrorMessage || this.errorMessage;
  }
}
