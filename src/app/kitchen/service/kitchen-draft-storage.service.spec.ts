import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { WorkspaceSnapshot } from './kitchen-history.service';
import {
  hashSignature,
  KitchenDraft,
  KitchenDraftStorageService,
  MAX_DRAFT_SIZE_CHARS
} from './kitchen-draft-storage.service';

describe('KitchenDraftStorageService — kopia lokalna', () => {
  let storage: KitchenDraftStorageService;
  const draft = (projectId: number | null, extra = ''): KitchenDraft => ({
    schemaVersion: 1,
    savedAt: '2026-10-04T10:00:00.000Z',
    projectId,
    projectName: 'Kuchnia' + extra,
    baseVersion: 3,
    signatureHash: hashSignature('sygnatura'),
    snapshot: { walls: [] } as unknown as WorkspaceSnapshot
  });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { user: signal({ id: 7 }) } }]
    });
    storage = TestBed.inject(KitchenDraftStorageService);
  });

  afterEach(() => localStorage.clear());

  it('D1: zapis i odczyt osobno dla projektu i dla nowego projektu', () => {
    expect(storage.save(draft(6))).toBeTrue();
    expect(storage.save(draft(null))).toBeTrue();

    expect(storage.load(6)?.projectId).toBe(6);
    expect(storage.load(null)?.projectId).toBeNull();
    expect(storage.load(8)).toBeNull();

    storage.clear(6);
    expect(storage.load(6)).toBeNull();
    expect(storage.load(null)).not.toBeNull();
  });

  it('kopia za duża nie jest zapisywana; uszkodzony wpis jest ignorowany', () => {
    expect(storage.save(draft(6, 'x'.repeat(MAX_DRAFT_SIZE_CHARS)))).toBeFalse();
    expect(storage.load(6)).toBeNull();

    localStorage.setItem('furnitio.kitchenDraft.v1.7.6', '{nie-json');
    expect(storage.load(6)).toBeNull();
  });

  it('D4: brak dostępu do localStorage nie psuje edytora', () => {
    spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');
    spyOn(localStorage, 'getItem').and.throwError('SecurityError');
    spyOn(localStorage, 'removeItem').and.throwError('SecurityError');

    expect(storage.save(draft(6))).toBeFalse();
    expect(storage.load(6)).toBeNull();
    expect(() => storage.clear(6)).not.toThrow();
  });

  it('skrót sygnatury jest stabilny i rozróżnia treść', () => {
    expect(hashSignature('abc')).toBe(hashSignature('abc'));
    expect(hashSignature('abc')).not.toBe(hashSignature('abd'));
  });
});
