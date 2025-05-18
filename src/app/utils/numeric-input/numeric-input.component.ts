import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-numeric-input',
  templateUrl: './numeric-input.component.html',
  styleUrls: ['./numeric-input.component.css'],
})
export class NumericInputComponent {
  @Input() id: string = ``;
  @Input() label: string = ''; // Etykieta pola
  @Input() value: number = 0; // Aktualna wartość (model)
  @Input() min: number = 0; // Minimalna wartość
  @Input() max: number = 100; // Maksymalna wartość
  @Input() step: number = 1; // Przyrost wartości (dla suwaczka)
  @Input() errorMessage: string = 'Wartość poza zakresem'; // Komunikat błędu
  @Input() isDisabled: boolean = false; // Blokada interakcji

  @Output() valueChange = new EventEmitter<number>(); // Emitowane przy zmianie wartości

  hasError: boolean = false; // Flaga do kontroli błędu

  constructor() {
    // Generowanie unikalnego ID, jeśli nie podano.
    if (!this.id) {
      this.id = `numeric-input-${Math.random().toString(36).slice(2, 11)}`;
    }
  }

  /**
   * Aktualizacja wartości z inputu lub suwaka
   */
  onValueChange(newValue: number): void {
    if (newValue < this.min || newValue > this.max) {
      this.hasError = true; // Błąd: wykraczamy poza zakres
    } else {
      this.hasError = false; // Poprawna wartość
    }

    if (!this.hasError) {
      this.value = newValue; // Aktualizacja wartości
      this.valueChange.emit(newValue); // Emitowanie do komponentu nadrzędnego
    }
  }
}
