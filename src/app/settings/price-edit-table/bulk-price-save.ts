import { EMPTY, Observable, catchError, merge, toArray } from 'rxjs';

/**
 * Runs independent price updates (one PUT per row) and emits exactly once, after every
 * request has settled, with the rows the backend confirmed. A failed request neither
 * cancels the others nor discards their responses — each PUT is a separate write.
 */
export function settlePriceUpdates<T>(ids: number[], update: (id: number) => Observable<T>): Observable<T[]> {
  return merge(...ids.map(id => update(id).pipe(catchError(() => EMPTY)))).pipe(toArray());
}

/**
 * Notice for a bulk save whose updates were not all confirmed, or null when they were.
 * A failed request does not prove the backend skipped the write, so the text talks about
 * unconfirmed saves and never promises a rollback.
 */
export function unconfirmedBulkSaveNotice(total: number, confirmed: number): string | null {
  const unconfirmed = total - confirmed;
  if (unconfirmed <= 0) {
    return null;
  }
  if (confirmed === 0) {
    return `Nie udało się potwierdzić zapisu zaznaczonych pozycji (${unconfirmed}). ` +
      'Ceny w tabeli mogą nie odpowiadać stanowi na serwerze. Zaznaczenie zostało zachowane.';
  }
  return `Potwierdzono zapis ${confirmed} z ${total} pozycji. ` +
    `Nie udało się potwierdzić zapisu pozostałych (${unconfirmed}) — ` +
    'ich ceny w tabeli mogą nie odpowiadać stanowi na serwerze. Zaznaczenie zostało zachowane.';
}
