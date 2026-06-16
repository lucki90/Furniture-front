import { Component, Input } from '@angular/core';
import { PrintDocService } from './service/print-doc.service';
import { PrintDocRequest } from '../alone-cabinet/model/cabinet-form.model';
import { ToastService } from '../core/error/toast.service';

@Component({
  selector: 'app-print-doc',
  templateUrl: './print-doc.component.html',
  styleUrls: ['./print-doc.component.css'],
  standalone: false
})
export class PrintDocComponent {
  @Input() response: PrintDocRequest[] | null = null;

  constructor(
    private printDocService: PrintDocService,
    private toast: ToastService
  ) {
  }

  downloadExcel(): void {
    if (!this.response?.length) {
      return;
    }

    this.printDocService.downloadExcel(this.response).subscribe({
      next: () => this.toast.success('Plik Excel został pobrany.'),
      error: () => this.toast.error('Błąd podczas pobierania pliku Excel.')
    });
  }
}
