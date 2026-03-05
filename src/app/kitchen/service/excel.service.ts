import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';

/**
 * DTO wysyłane do backendu — odpowiada ExcelRowRequest.java
 * Jeden wiersz = jedna płyta w zamówieniu
 */
export interface ExcelRowRequest {
  /** Liczba porządkowa */
  lp: number;
  /** Ilość sztuk */
  quantity: number;
  /** Symbol/nazwa materiału (np. "MDF_LAMINATED", "Blat dębowy") */
  symbol: string;
  /** Grubość w mm */
  thickness: number;
  /** Długość w mm (kierunek słoja) */
  length: number;
  /** Okleina na długości (0 = brak) */
  lengthVeneer: number;
  /** Szerokość w mm */
  width: number;
  /** Okleina na szerokości (0 = brak) */
  widthVeneer: number;
  /** Kolor okleiny (pusty gdy brak) */
  veneerColor: string;
  /** Naklejka na płycie (pusty gdy brak) */
  sticker: string;
  /**
   * Uwagi do płyty — np. "2 puszki ø35mm na boku", "rzaz na boku 450mm"
   * Kolumna gotowa, automatyczne generowanie uwag w kolejnej iteracji
   */
  remarks: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExcelService {

  private readonly http = inject(HttpClient);
  // server.servlet.contextPath=/api/furniture — wszystkie endpointy mają ten prefix
  private readonly downloadUrl = 'http://localhost:8080/api/furniture/download/excel';

  /**
   * Wysyła listę płyt do backendu, odbiera plik .xlsx i uruchamia pobieranie w przeglądarce.
   * @param rows — wiersze zamówienia (lista płyt)
   * @param filename — nazwa pobieranego pliku (domyślnie zamowienie_plyt.xlsx)
   */
  downloadBoardList(rows: ExcelRowRequest[], filename = 'zamowienie_plyt.xlsx'): Observable<void> {
    return this.http.post(this.downloadUrl, rows, { responseType: 'blob' }).pipe(
      tap((blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
      }),
      map(() => undefined as void)
    );
  }
}
