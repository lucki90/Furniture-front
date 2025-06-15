import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

@Component({
    selector: 'app-radio-button',
    templateUrl: './radio-button.component.html',
    styleUrls: ['./radio-button.component.css'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => RadioButtonComponent),
            multi: true,
        },
    ],
    standalone: false
})
export class RadioButtonComponent implements ControlValueAccessor {
  @Input() id: string = '';
  @Input() options: { value: any; label: string; tooltip?: string }[] = [];
  @Input() title: string = '';
  @Input() visible: boolean = true;
  @Input() disabled: boolean = false;

  @Output() selectedValueChange = new EventEmitter<any>();

  selectedValue: any = null;

  // ControlValueAccessor callbacks
  onChange: (value: any) => void = () => {};
  onTouch: () => void = () => {};

  // Zmiana zaznaczenia
  onSelectionChange(value: any): void {
    if (this.disabled) return;
    this.selectedValue = value;
    this.onChange(value);
    this.onTouch();
    this.selectedValueChange.emit(value);
  }

  // ControlValueAccessor methods
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
    return !this.isValid() && !this.disabled; // Nie pokazujemy błędu dla wyłączonej kontrolki
  }

}
