import { Injectable, computed, signal } from '@angular/core';
import { WallWithCabinets } from '../model/kitchen-state.model';

export interface WorkspaceSnapshot {
  walls: WallWithCabinets[];
  selectedWallId: string;
  wallIdCounter: number;
  cabinetIdCounter: number;
  projectSettings: {
    plinthHeightMm: number;
    countertopThicknessMm: number;
    upperFillerHeightMm: number;
    distanceFromWallMm: number;
    plinthSetbackMm: number;
    fillerWidthMm: number;
    frontGapMm: number;
    supportHeightReductionMm: number;
    supportWidthReductionMm: number;
  };
  projectMetadata: {
    roomWidthMm: number | null;
    roomDepthMm: number | null;
  };
}

const MAX_HISTORY_STEPS = 20;

/**
 * Zarządza historią zmian w workspace kuchni.
 * Przechowuje snapshoty pełnego lokalnego stanu edycji projektu przed każdą mutacją:
 * ściany/szafki, ustawienia projektu oraz wymiary pomieszczenia.
 * Undo/redo działa jak klasyczny stos.
 */
@Injectable({
  providedIn: 'root'
})
export class KitchenHistoryService {

  private _undoStack = signal<WorkspaceSnapshot[]>([]);
  private _redoStack = signal<WorkspaceSnapshot[]>([]);

  readonly canUndo = computed(() => this._undoStack().length > 0);
  readonly canRedo = computed(() => this._redoStack().length > 0);
  readonly undoCount = computed(() => this._undoStack().length);
  readonly redoCount = computed(() => this._redoStack().length);

  /**
   * Zapisuje snapshot PRZED mutacją. Każda nowa akcja czyści stos redo.
   */
  push(snapshot: WorkspaceSnapshot): void {
    this._undoStack.update(stack => {
      const next = [...stack, snapshot];
      return next.length > MAX_HISTORY_STEPS ? next.slice(next.length - MAX_HISTORY_STEPS) : next;
    });
    this._redoStack.set([]);
  }

  /**
   * Zwraca poprzedni snapshot (lub null gdy brak historii).
   * Przesuwa bieżący stan na stos redo.
   */
  undo(current: WorkspaceSnapshot): WorkspaceSnapshot | null {
    const stack = this._undoStack();
    if (stack.length === 0) {
      return null;
    }
    const previous = stack[stack.length - 1];
    this._undoStack.update(s => s.slice(0, -1));
    this._redoStack.update(s => [current, ...s].slice(0, MAX_HISTORY_STEPS));
    return previous;
  }

  /**
   * Zwraca następny snapshot ze stosu redo (lub null gdy brak).
   * Przesuwa bieżący stan na stos undo.
   */
  redo(current: WorkspaceSnapshot): WorkspaceSnapshot | null {
    const stack = this._redoStack();
    if (stack.length === 0) {
      return null;
    }
    const next = stack[0];
    this._redoStack.update(s => s.slice(1));
    this._undoStack.update(s => [...s, current].slice(-MAX_HISTORY_STEPS));
    return next;
  }

  /** Czyści całą historię — wywołać przy załadowaniu / resecie projektu. */
  clear(): void {
    this._undoStack.set([]);
    this._redoStack.set([]);
  }
}
