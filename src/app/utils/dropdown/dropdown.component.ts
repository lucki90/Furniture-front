import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.css'],
})
export class DropdownComponent {
  @Input() id: string = '';
  @Input() options: { value: any; label: string }[] = []; // Opcje w liście rozwijanej
  @Input() selectedValue: any = null; // Aktualnie wybrana wartość
  @Input() label: string = ''; // Etykieta dropdowna
  @Input() visible: boolean = true; // Widoczność komponentu
  @Input() disable: boolean = false; // Czy lista jest zablokowana
  @Input() translations: { [key: string]: string } = {}; // Obiekt z tłumaczeniami

  @Output() selectedValueChange = new EventEmitter<any>(); // Zdarzenie zmiany wyboru

  hasError: boolean = false;

  constructor() {
    // Generowanie unikalnego ID, jeśli nie podano.
    if (!this.id) {
      this.id = `dropdown-${Math.random().toString(36).slice(2, 11)}`;
    }
  }

  /**
   * Obsługa zmian wyboru
   */
  onSelectionChange(event: any): void {
    if (!this.disable) {
      const value = event.target.value;
      this.selectedValue = value;
      this.selectedValueChange.emit(value); // Emituj nowy wybór
    }
  }
}
