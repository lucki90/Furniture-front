import { ChangeDetectionStrategy, Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-radio-button',
  templateUrl: './radio-button.component.html',
  styleUrls: ['./radio-button.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioButtonComponent),
      multi: true
    }
  ],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RadioButtonComponent implements ControlValueAccessor {
  @Input() id: string = '';
  @Input() options: { value: any; label: string; tooltip?: string }[] = [];
  @Input() title: string = '';
  @Input() visible: boolean = true;
  @Input() disabled: boolean = false;
  @Input() errorMessage: string = 'To pole wymaga poprawnej wartosci.';
  @Input() externalErrorMessage: string | null = null;

  @Output() selectedValueChange = new EventEmitter<any>();

  selectedValue: any = null;

  onChange: (value: any) => void = () => undefined;
  onTouch: () => void = () => undefined;

  onSelectionChange(value: any): void {
    if (this.disabled) {
      return;
    }

    this.selectedValue = value;
    this.onChange(value);
    this.onTouch();
    this.selectedValueChange.emit(value);
  }

  writeValue(value: any): void {
    this.selectedValue = value;
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

  isValid(): boolean {
    return !(this.selectedValue === null || this.selectedValue === undefined);
  }

  get hasError(): boolean {
    return !!this.externalErrorMessage || (!this.isValid() && !this.disabled);
  }

  get displayedErrorMessage(): string {
    return this.externalErrorMessage || this.errorMessage;
  }

  protected trackByValue = (_: number, option: { value: any; label: string }) => option.value;
}
