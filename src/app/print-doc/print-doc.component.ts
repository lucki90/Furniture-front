import {Component, Input} from '@angular/core';
import {PrintDocService} from '../services/print-doc.service';

@Component({
  selector: 'app-print-doc',
  templateUrl: './print-doc.component.html',
  styleUrls: ['./print-doc.component.css']
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

// OPEN AI | a wyzej z DEEPSEEK
  downloadExcel2(responseData: any): void {
    this.printDocService.downloadExcel(responseData).subscribe(
      (blob: Blob) => {
        // Tworzymy tymczasowy link do pobrania pliku
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cabinet.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      (error) => {
        console.error('Error generating Excel', error);
      }
    );
  }
}
