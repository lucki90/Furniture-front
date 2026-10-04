import { DestroyRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/error/toast.service';
import { DraftRecoveryDialogData } from '../draft-recovery/draft-recovery-dialog.component';
import { WorkspaceSnapshot } from './kitchen-history.service';
import { DRAFT_SAVE_DELAY_MS, KitchenDraftService } from './kitchen-draft.service';
import { hashSignature, KitchenDraftStorageService } from './kitchen-draft-storage.service';
import { KitchenStateService } from './kitchen-state.service';

describe('KitchenDraftService — kopia lokalna niezapisanych zmian', () => {
  const dirty = signal(false);
  const projectId = signal<number | null>(6);
  const walls = signal<unknown[]>([]);
  const session = signal(0);
  const version = signal(4);
  let signature: string;
  let state: { restoreDraft: jasmine.Spy };
  let dialog: jasmine.SpyObj<MatDialog>;
  let storage: KitchenDraftStorageService;
  let service: KitchenDraftService;
  let destroyCallbacks: (() => void)[];

  const draftSnapshot = { walls: [{ id: 'wall-1', cabinets: [] }] } as unknown as WorkspaceSnapshot;

  beforeEach(() => {
    localStorage.clear();
    jasmine.clock().install();
    dirty.set(false);
    projectId.set(6);
    walls.set([]);
    session.set(0);
    version.set(4);
    signature = 'zapisany';
    destroyCallbacks = [];
    state = {
      restoreDraft: jasmine.createSpy('restoreDraft')
    };
    Object.assign(state, {
      hasUnsavedChanges: dirty.asReadonly(),
      currentProjectId: projectId.asReadonly(),
      walls: walls.asReadonly(),
      openedProjectSession: session.asReadonly(),
      currentProjectName: signal('Kuchnia').asReadonly(),
      currentProjectVersion: version.asReadonly(),
      persistedSignature: () => signature,
      exportDraftSnapshot: () => draftSnapshot
    });
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    TestBed.configureTestingModule({
      providers: [
        { provide: KitchenStateService, useValue: state },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success']) },
        { provide: AuthService, useValue: { user: signal({ id: 7 }) } }
      ]
    });
    storage = TestBed.inject(KitchenDraftStorageService);
    service = TestBed.inject(KitchenDraftService);
  });

  afterEach(() => {
    destroyCallbacks.forEach(callback => callback());
    jasmine.clock().uninstall();
    localStorage.clear();
  });

  function start(): void {
    service.start({ onDestroy: (callback: () => void) => destroyCallbacks.push(callback) } as unknown as DestroyRef);
    TestBed.tick();
  }

  function edit(newSignature: string): void {
    signature = newSignature;
    dirty.set(true);
    walls.set([{ id: newSignature }]);
    TestBed.tick();
  }

  function storeDraft(forProjectId: number | null, draftSignature: string, baseVersion = 4): void {
    storage.save({
      schemaVersion: 1,
      savedAt: '2026-10-04T08:30:00.000Z',
      projectId: forProjectId,
      projectName: 'Kuchnia',
      baseVersion,
      signatureHash: hashSignature(draftSignature),
      snapshot: draftSnapshot
    });
  }

  function chooseInDialog(choice: string | undefined): void {
    dialog.open.and.returnValue({ afterClosed: () => of(choice) } as never);
  }

  it('D1: niezapisane zmiany trafiają do kopii po opóźnieniu, kolejna zmiana odsuwa zapis', () => {
    start();

    edit('zmiana-1');
    jasmine.clock().tick(DRAFT_SAVE_DELAY_MS - 1);
    edit('zmiana-2');
    jasmine.clock().tick(DRAFT_SAVE_DELAY_MS - 1);
    expect(storage.load(6)).toBeNull();

    jasmine.clock().tick(1);
    const draft = storage.load(6);
    expect(draft?.baseVersion).toBe(4);
    expect(draft?.projectName).toBe('Kuchnia');
    expect(draft?.signatureHash).toBe(hashSignature('zmiana-2'));
    expect(draft?.snapshot).toEqual(draftSnapshot);
  });

  it('D1: bez niezapisanych zmian kopia nie powstaje', () => {
    start();

    walls.set([{ id: 'inna-ściana' }]);
    TestBed.tick();
    jasmine.clock().tick(DRAFT_SAVE_DELAY_MS);

    expect(storage.load(6)).toBeNull();
  });

  it('D2: zapis projektu czyści kopię nowego projektu i zapisanego, także zaplanowaną', () => {
    start();
    storeDraft(null, 'nowy');
    projectId.set(null);
    edit('nowy-2');

    service.clearAfterSave(null, 9);
    jasmine.clock().tick(DRAFT_SAVE_DELAY_MS);

    expect(storage.load(null)).toBeNull();
    expect(storage.load(9)).toBeNull();
  });

  it('D2: powrót do stanu zapisanego w tym samym projekcie czyści kopię', () => {
    start();
    edit('zmiana');
    jasmine.clock().tick(DRAFT_SAVE_DELAY_MS);
    expect(storage.load(6)).not.toBeNull();

    signature = 'zapisany';
    dirty.set(false);
    TestBed.tick();

    expect(storage.load(6)).toBeNull();
  });

  it('D2: odrzucenie zmian czyści kopię bieżącego projektu', () => {
    storeDraft(6, 'zmiana');

    service.discardCurrent();

    expect(storage.load(6)).toBeNull();
  });

  it('D3: po otwarciu projektu proponuje odzyskanie i przywraca kopię z wersją bazową', () => {
    start();
    storeDraft(6, 'zmiana', 3);
    chooseInDialog('RESTORE');

    session.update(value => value + 1);
    TestBed.tick();

    const data = dialog.open.calls.mostRecent().args[1]?.data as DraftRecoveryDialogData;
    expect(data.projectName).toBe('Kuchnia');
    expect(data.newerVersionSaved).toBeTrue();
    expect(state.restoreDraft).toHaveBeenCalledWith(draftSnapshot, 3);
  });

  it('D3: odrzucenie w oknie usuwa kopię, zamknięcie okna ją zostawia', () => {
    storeDraft(6, 'zmiana');
    chooseInDialog(undefined);
    start();
    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(storage.load(6)).not.toBeNull();
    expect(state.restoreDraft).not.toHaveBeenCalled();

    chooseInDialog('DISCARD');
    session.update(value => value + 1);
    TestBed.tick();

    expect(storage.load(6)).toBeNull();
  });

  it('D3: kopia identyczna z zapisanym projektem jest usuwana bez pytania', () => {
    storeDraft(6, 'zapisany');

    start();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(storage.load(6)).toBeNull();
  });

  it('D3: kopia zgodna z niezapisaną treścią w edytorze zostaje bez pytania', () => {
    signature = 'zmiana';
    dirty.set(true);
    storeDraft(6, 'zmiana');

    start();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(storage.load(6)).not.toBeNull();
  });
});
