import {Component, forwardRef, Input} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';

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
  @Input() options: { value: any; label: string }[] = [];
  @Input() label: string = '';
  @Input() visible: boolean = true;
  @Input() translations: { [key: string]: string } = {};

  value: any = null;
  disabled: boolean = false;

  private onChange: any = () => {
  };
  private onTouched: any = () => {
  };

  ngOnInit() {
    if (!this.id) {
      this.id = `dropdown-${Math.random().toString(36).slice(2, 11)}`;
    }
  }

  onSelectionChange(event: Event): void {
    this.value = event;
    this.onChange(this.value);
    this.onTouched();
  }
  //   onSelectionChange(event: any): void {
  //     if (!this.disable) {
  //       const value = event.target.value;
  //       this.selectedValue = value;
  //       this.selectedValueChange.emit(value); // Emituj nowy wybór
  //     }
  //   }

  writeValue(value: any): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  isValid(): boolean {
    return !(this.value === null || this.value === undefined);

  }

  get hasError(): boolean {
    return !this.isValid() && !this.disabled; // Nie pokazujemy błędu dla wyłączonej kontrolki
  }

}
