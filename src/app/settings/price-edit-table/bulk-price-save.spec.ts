import { Subject } from 'rxjs';
import { settlePriceUpdates, unconfirmedBulkSaveNotice } from './bulk-price-save';

describe('settlePriceUpdates', () => {
  it('emits once, after every request settled, with the confirmed rows only', () => {
    const requests = new Map([1, 2, 3].map(id => [id, new Subject<{ id: number }>()]));
    const emitted: { id: number }[][] = [];

    settlePriceUpdates([1, 2, 3], id => requests.get(id)!).subscribe(rows => emitted.push(rows));
    requests.get(3)!.next({ id: 3 });
    requests.get(3)!.complete();
    requests.get(1)!.error(new Error('500'));
    expect(emitted).toEqual([]);

    requests.get(2)!.next({ id: 2 });
    requests.get(2)!.complete();

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual(jasmine.arrayWithExactContents([{ id: 2 }, { id: 3 }]));
  });

  it('keeps waiting for, and collects, a success that arrives after an earlier error', () => {
    const requests = new Map([3, 1].map(id => [id, new Subject<{ requestedId: number; id: number }>()]));
    const emitted: { requestedId: number; id: number }[][] = [];

    settlePriceUpdates([3, 1], id => requests.get(id)!).subscribe(rows => emitted.push(rows));
    requests.get(1)!.error(new Error('500'));
    expect(emitted).toEqual([]);

    requests.get(3)!.next({ requestedId: 3, id: 99 });
    requests.get(3)!.complete();

    expect(emitted).toEqual([[{ requestedId: 3, id: 99 }]]);
  });

  it('emits an empty list when there is nothing to update', () => {
    const emitted: unknown[][] = [];

    settlePriceUpdates([], () => new Subject<unknown>()).subscribe(rows => emitted.push(rows));

    expect(emitted).toEqual([[]]);
  });
});

describe('unconfirmedBulkSaveNotice', () => {
  it('returns no notice when every update was confirmed', () => {
    expect(unconfirmedBulkSaveNotice(3, 3)).toBeNull();
  });

  it('reports confirmed and unconfirmed counts without promising a rollback', () => {
    expect(unconfirmedBulkSaveNotice(5, 3)).toBe(
      'Potwierdzono zapis 3 z 5 pozycji. Nie udało się potwierdzić zapisu pozostałych (2) — ' +
      'ich ceny w tabeli mogą nie odpowiadać stanowi na serwerze. Zaznaczenie zostało zachowane.'
    );
  });
});
