import {Directive, ElementRef, HostListener, Input} from '@angular/core';
import {NgControl} from '@angular/forms';


/**
 * Dyretywa sprawdzajaca dlugosc inputu liczbowego i przycinajaca jego dlugosc.
 * Wykorzystanie, przyklad:
 *   <input
 *     [appMaxLengthForNumber]="10"
 *     [maxDecimalPlaces]="2"
 *   />
 */
@Directive({
  selector: '[appMaxLengthForNumber]',
  standalone: false
})
export class MaxLengthForNumberDirective {
  @Input('appMaxLengthForNumber') maxLength = 10;
  @Input() maxDecimalPlaces = 2;

  constructor(
    private ngControl: NgControl,
    private el: ElementRef
  ) {
  }

  @HostListener('input', ['$event'])
  onInput(event: InputEvent) {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (!value) return;

    // Zapisz pozycję kursora
    const cursorPosition = input.selectionStart;

    // Formatowanie wartości
    const parts = value.split('.');
    let integerPart = parts[0].slice(0, this.maxLength);
    let decimalPart = parts[1] ?? '';

    if (decimalPart.length > this.maxDecimalPlaces) {
      decimalPart = decimalPart.slice(0, this.maxDecimalPlaces);
    }

    let finalValue = integerPart;
    if (parts.length > 1) {
      finalValue += '.' + decimalPart;
    }

    // Aktualizuj wartość tylko jeśli się zmieniła
    if (value !== finalValue) {
      this.ngControl.control?.setValue(finalValue, {emitEvent: false});

      // Przywróć pozycję kursora
      setTimeout(() => {
        input.setSelectionRange(cursorPosition, cursorPosition);
      });
    }
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Dozwolone klawisze
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'
    ];

    if (allowedKeys.includes(event.key)) {
      return;
    }

    // Sprawdź czy to cyfra, kropka lub przecinek
    if (!/^\d|[.,]$/.test(event.key)) {
      event.preventDefault();
      return;
    }

    const input = event.target as HTMLInputElement;
    const value = input.value;
    const selectionStart = input.selectionStart || 0;
    const selectionEnd = input.selectionEnd || 0;

    // Zamień przecinek na kropkę
    const keyToUse = event.key === ',' ? '.' : event.key;
    const newValue = value.slice(0, selectionStart) + keyToUse + value.slice(selectionEnd);

    // Sprawdź kropkę
    if (keyToUse === '.') {
      if (value.includes('.')) {
        event.preventDefault();
        return;
      }
    }

    // Sprawdź długość części całkowitej
    const parts = newValue.split('.');
    if (parts[0].length > this.maxLength) {
      event.preventDefault();
      return;
    }

    // Sprawdź długość części dziesiętnej
    if (parts.length > 1 && parts[1].length > this.maxDecimalPlaces) {
      event.preventDefault();
      return;
    }
  }
}
