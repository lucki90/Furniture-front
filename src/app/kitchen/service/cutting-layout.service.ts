import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Board } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { CuttingBoardRequest, CuttingLayoutResponse } from '../model/cutting-layout.model';

@Injectable()
export class CuttingLayoutService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cancelRequest$ = new Subject<void>();
  private readonly layoutUrl = `${environment.apiUrl}/cutting/layout`;

  readonly layout = signal<CuttingLayoutResponse | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  /** Ładuje rozkrój dopiero po wejściu użytkownika na zakładkę. */
  loadLayout(boards: readonly Board[]): void {
    this.cancelRequest$.next();
    this.isLoading.set(true);
    this.error.set(null);
    this.layout.set(null);

    this.http.post<CuttingLayoutResponse>(this.layoutUrl, this.mergeBoards(boards)).pipe(
      takeUntil(this.cancelRequest$),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: layout => this.layout.set(layout),
      error: () => {
        this.layout.set(null);
        this.error.set('Nie udało się obliczyć rozkroju. Spróbuj ponownie.');
      }
    });
  }

  /** Anuluje aktywne żądanie i czyści stan powiązany z poprzednią kalkulacją projektu. */
  reset(): void {
    this.cancelRequest$.next();
    this.layout.set(null);
    this.isLoading.set(false);
    this.error.set(null);
  }

  /**
   * Scala pozycje z poszczególnych szafek tak samo jak globalny BOM backendu.
   * Ilość nie należy do tożsamości BoardDto, dlatego sumujemy ją przed wysłaniem listy.
   */
  private mergeBoards(boards: readonly Board[]): CuttingBoardRequest[] {
    const merged = new Map<string, CuttingBoardRequest>();

    for (const board of boards) {
      const request = this.toRequest(board);
      const key = JSON.stringify([
        request.material,
        request.boardThickness,
        request.varnished,
        request.color,
        request.veneerColor,
        request.sideX,
        request.sideY,
        request.lshapeCutoutLengthAMm ?? null,
        request.lshapeCutoutLengthBMm ?? null,
        request.veneerX,
        request.veneerY,
        request.boardName
      ]);
      const existing = merged.get(key);
      if (existing) {
        existing.quantity += request.quantity;
      } else {
        merged.set(key, request);
      }
    }

    return Array.from(merged.values());
  }

  private toRequest(board: Board): CuttingBoardRequest {
    return {
      quantity: board.quantity,
      sideX: board.sideX,
      sideY: board.sideY,
      boardThickness: board.boardThickness,
      veneerX: board.veneerX ?? 0,
      veneerY: board.veneerY ?? 0,
      boardName: board.boardName,
      boardNameLabel: board.boardNameLabel,
      color: board.color || 'DEFAULT',
      veneerColor: board.veneerColor ?? '',
      material: board.material || board.boardName,
      varnished: board.varnished ?? false,
      lshapeCutoutLengthAMm: board.lshapeCutoutLengthAMm ?? board.lShapeCutoutLengthAMm,
      lshapeCutoutLengthBMm: board.lshapeCutoutLengthBMm ?? board.lShapeCutoutLengthBMm
    };
  }
}
