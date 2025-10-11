import {Component, Input} from '@angular/core';
import {PrintDocService} from './service/print-doc.service';

@Component({
  selector: 'app-print-doc',
  templateUrl: './print-doc.component.html',
  styleUrls: ['./print-doc.component.css'],
  standalone: false
})
export class PrintDocComponent {
  @Input() response: any; // Dane do wysłania w payloadzie

  constructor(private printDocService: PrintDocService) {
  }

  // Metoda do pobierania pliku Excel
  downloadExcel(response: any) {
    console.log("TREEEE")
    if (response) {
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
