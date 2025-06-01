import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-radio-button',
  templateUrl: './radio-button.component.html',
  styleUrls: ['./radio-button.component.css'],
})
export class RadioButtonComponent {
  @Input() id: string = ''; // id
  @Input() options: { value: any; label: string; tooltip?: string }[] = []; // Opcje radiobuttonów
  @Input() selectedValue: any = null; // Aktualnie wybrana wartość
  @Input() title: string = ''; // Tytuł sekcji

  @Input() visible: boolean = true; // Kontroluje widoczność komponentu
  @Input() disable: boolean = false; // Kontroluje możliwość interakcji

  @Output() selectedValueChange = new EventEmitter<any>(); // Zdarzenie dla zmiany wyboru

  // Funkcja obsługująca zmianę
  onSelectionChange(value: any): void {
    if (this.disable) {
      return; // Ignoruj kliknięcia, jeśli komponent jest zablokowany
    }
    this.selectedValue = value;
    this.selectedValueChange.emit(value); // Emituj nowy wybór
  }
}
