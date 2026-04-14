import {Component, Input} from '@angular/core';
import {PrintDocService} from './service/print-doc.service';
import { PrintDocRequest } from '../alone-cabinet/model/cabinet-form.model';

@Component({
  selector: 'app-print-doc',
  templateUrl: './print-doc.component.html',
  styleUrls: ['./print-doc.component.css'],
  standalone: false
})
export class PrintDocComponent {
  @Input() response: PrintDocRequest[] | null = null; // Dane do wysłania w payloadzie

  constructor(private printDocService: PrintDocService) {
  }

  // Metoda do pobierania pliku Excel
  // TODO(CODEX): To wygląda jak legacy-owy, bardzo wąski wrapper używany tylko przez alone-cabinet. Metoda ignoruje przekazany argument i operuje na this.response, a przy błędzie loguje tylko do konsoli bez żadnej informacji dla użytkownika. Warto uprościć API komponentu albo włączyć go w nowszy, wspólny mechanizm eksportu plików.
  downloadExcel(response: PrintDocRequest[] | null) {
    if (response && this.response) {
      this.printDocService.downloadExcel(this.response).subscribe({
        next: (response) => {
          // Tworzenie linku do pobrania pliku
          const url = window.URL.createObjectURL(response);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'szafka.xlsx';
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          console.error('Błąd podczas pobierania Excela:', err);
        }
      });
    }
  }
}
