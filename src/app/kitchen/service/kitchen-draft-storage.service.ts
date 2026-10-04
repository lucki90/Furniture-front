import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceSnapshot } from './kitchen-history.service';

/** Kopia lokalna niezapisanych zmian projektu (przeglądarka tego użytkownika). */
export interface KitchenDraft {
  schemaVersion: 1;
  /** ISO 8601 */
  savedAt: string;
  projectId: number | null;
  projectName: string | null;
  /** Wersja projektu, na której powstały zmiany (0 — projekt niezapisany). */
  baseVersion: number;
  /** Skrót sygnatury zapisywanej treści — kopia identyczna z projektem nie jest proponowana. */
  signatureHash: string;
  snapshot: WorkspaceSnapshot;
}

const KEY_PREFIX = 'furnitio.kitchenDraft.v1';
/** Powyżej limitu kopia nie jest zapisywana (localStorage ma zwykle ok. 5 MB na domenę). */
export const MAX_DRAFT_SIZE_CHARS = 2_000_000;

/**
 * Kopia lokalna w {@code localStorage}, osobno dla użytkownika i projektu. Każdy dostęp w {@code try/catch} — tryb
 * prywatny, wyczyszczone dane albo pełna pamięć nie mogą psuć edytora.
 */
@Injectable({ providedIn: 'root' })
export class KitchenDraftStorageService {
  private readonly authService = inject(AuthService);

  save(draft: KitchenDraft): boolean {
    try {
      const json = JSON.stringify(draft);
      if (json.length > MAX_DRAFT_SIZE_CHARS) {
        return false;
      }
      localStorage.setItem(this.key(draft.projectId), json);
      return true;
    } catch (error) {
      console.warn('[KitchenDraftStorage] Nie udało się zapisać kopii lokalnej.', error);
      return false;
    }
  }

  load(projectId: number | null): KitchenDraft | null {
    try {
      const json = localStorage.getItem(this.key(projectId));
      if (!json) {
        return null;
      }
      const draft = JSON.parse(json) as KitchenDraft;
      return draft?.schemaVersion === 1 && draft.snapshot ? draft : null;
    } catch {
      return null;
    }
  }

  clear(projectId: number | null): void {
    try {
      localStorage.removeItem(this.key(projectId));
    } catch {
      // Brak dostępu do pamięci — nie ma czego czyścić.
    }
  }

  private key(projectId: number | null): string {
    return `${KEY_PREFIX}.${this.authService.user()?.id ?? 'anon'}.${projectId ?? 'new'}`;
  }
}

/** Krótki, stabilny skrót tekstu (djb2) — porównanie treści bez przechowywania całej sygnatury. */
export function hashSignature(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(36) + ':' + value.length;
}
