import {Directive, HostListener, Input} from '@angular/core';
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
  selector: '[appMaxLengthForNumber]'
})
export class MaxLengthForNumberDirective {
  @Input('appMaxLengthForNumber') maxLength = 10; // max długość całkowita
  @Input() maxDecimalPlaces = 2; // maksymalna liczba cyfr po przecinku

  constructor(private ngControl: NgControl) {
  }

  @HostListener('input', ['$event.target.value'])
  onInput(value: string) {
    if (!value) return;

    // 1. Ucinamy liczby po przecinku
    const parts = value.split('.');
    let integerPart = parts[0].slice(0, this.maxLength); // ogranicz długość całkowitą

    let decimalPart = parts[1] ?? '';
    if (decimalPart.length > this.maxDecimalPlaces) {
      decimalPart = decimalPart.slice(0, this.maxDecimalPlaces);
    }

    let finalValue = integerPart;
    if (parts.length > 1 && this.maxDecimalPlaces > 0) {
      finalValue += '.' + decimalPart;
    }

    // 2. Ustawiamy wartość w kontrolce
    this.ngControl.control?.setValue(Number(finalValue));
  }
}
