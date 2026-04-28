import { TestBed } from '@angular/core/testing';
import { KitchenHistoryService, WorkspaceSnapshot } from './kitchen-history.service';

function makeSnapshot(tag: string): WorkspaceSnapshot {
  return {
    walls: [],
    selectedWallId: tag,
    wallIdCounter: 1,
    cabinetIdCounter: 0,
    projectSettings: {
      plinthHeightMm: 100,
      countertopThicknessMm: 38,
      upperFillerHeightMm: 100,
      distanceFromWallMm: 560,
      plinthSetbackMm: 60,
      fillerWidthMm: 50,
      frontGapMm: 2,
      supportHeightReductionMm: 30,
      supportWidthReductionMm: 50
    },
    projectMetadata: {
      roomWidthMm: null,
      roomDepthMm: null
    }
  };
}

describe('KitchenHistoryService', () => {
  let service: KitchenHistoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KitchenHistoryService);
  });

  it('świeży serwis: canUndo i canRedo są false', () => {
    expect(service.canUndo()).toBeFalse();
    expect(service.canRedo()).toBeFalse();
  });

  it('push zwiększa canUndo do true i czyści redo', () => {
    service.push(makeSnapshot('A'));
    expect(service.canUndo()).toBeTrue();
    expect(service.canRedo()).toBeFalse();
  });

  it('undo zwraca poprzedni snapshot i przesuwa bieżący na redo', () => {
    const snapA = makeSnapshot('A');
    const snapCurrent = makeSnapshot('current');
    service.push(snapA);

    const result = service.undo(snapCurrent);

    expect(result).toEqual(snapA);
    expect(service.canUndo()).toBeFalse();
    expect(service.canRedo()).toBeTrue();
  });

  it('undo zwraca null gdy stos pusty', () => {
    expect(service.undo(makeSnapshot('X'))).toBeNull();
  });

  it('redo zwraca snapshot ze stosu i przesuwa bieżący na undo', () => {
    const snapA = makeSnapshot('A');
    const snapCurrent = makeSnapshot('current');
    service.push(snapA);
    service.undo(snapCurrent);

    const result = service.redo(snapCurrent);

    expect(result).toEqual(snapCurrent);
    expect(service.canRedo()).toBeFalse();
    expect(service.canUndo()).toBeTrue();
  });

  it('redo zwraca null gdy stos redo pusty', () => {
    expect(service.redo(makeSnapshot('X'))).toBeNull();
  });

  it('push po undo czyści stos redo', () => {
    service.push(makeSnapshot('A'));
    service.undo(makeSnapshot('B'));
    expect(service.canRedo()).toBeTrue();

    service.push(makeSnapshot('C'));
    expect(service.canRedo()).toBeFalse();
  });

  it('clear czyści oba stosy', () => {
    service.push(makeSnapshot('A'));
    service.push(makeSnapshot('B'));
    service.clear();

    expect(service.canUndo()).toBeFalse();
    expect(service.canRedo()).toBeFalse();
  });

  it('undoCount i redoCount odzwierciedlają rozmiary stosów', () => {
    service.push(makeSnapshot('A'));
    service.push(makeSnapshot('B'));
    expect(service.undoCount()).toBe(2);
    expect(service.redoCount()).toBe(0);

    service.undo(makeSnapshot('C'));
    expect(service.undoCount()).toBe(1);
    expect(service.redoCount()).toBe(1);
  });

  it('undo/redo dla sekwencji wielu kroków zachowuje kolejność', () => {
    service.push(makeSnapshot('A'));
    service.push(makeSnapshot('B'));
    service.push(makeSnapshot('C'));

    expect(service.undo(makeSnapshot('D'))?.selectedWallId).toBe('C');
    expect(service.undo(makeSnapshot('C'))?.selectedWallId).toBe('B');
    expect(service.undo(makeSnapshot('B'))?.selectedWallId).toBe('A');
    expect(service.canUndo()).toBeFalse();

    expect(service.redo(makeSnapshot('A'))?.selectedWallId).toBe('B');
  });
});
