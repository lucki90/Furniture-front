import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

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
  @Input() errorMessage: string = 'To pole wymaga poprawnej wartosci.';
  @Input() externalErrorMessage: string | null = null;
  @Input() visible: boolean = true;
  @Input() translations: { [key: string]: string } = {};

  value: any = null;
  disabled = false;

  private onChange: (value: any) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngOnInit(): void {
    if (!this.id) {
      this.id = `dropdown-${Math.random().toString(36).slice(2, 11)}`;
    }
  }

  // TODO(CODEX): Ten CVA jest podejrzany i warto go uwaznie poprawic: korzysta rownoczesnie z `[(ngModel)]`
  // w template oraz z wlasnego ControlValueAccessor. Takie mieszanie dwoch modeli formularzy latwo rodzi
  // subtelne bugi synchronizacji.
  onSelectionChange(value: any): void {
    this.value = value;
    this.onChange(this.value);
    this.onTouched();
  }

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
    return !!this.externalErrorMessage || (!this.isValid() && !this.disabled);
  }

  get displayedErrorMessage(): string {
    return this.externalErrorMessage || this.errorMessage;
  }
}
