import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { Observable, Subject } from 'rxjs';

import { CsvImportDialogComponent } from './csv-import-dialog.component';
import { MaterialAdminService } from '../../service/material-admin.service';
import { CsvImportResultResponse } from '../../model/material-variant.model';

describe('CsvImportDialogComponent', () => {
  let materialService: jasmine.SpyObj<MaterialAdminService>;

  describe('zamknięcie dialogu podczas trwającego importu (prawdziwy MatDialog i overlay)', () => {
    let realRef: MatDialogRef<CsvImportDialogComponent, boolean>;
    let realComponent: CsvImportDialogComponent;
    let pending: Subject<CsvImportResultResponse>;
    let afterClosed: jasmine.Spy;

    const overlay = (): HTMLElement => document.querySelector('.cdk-overlay-container') as HTMLElement;
    const dialogOpen = (): boolean => overlay().querySelector('mat-dialog-container') !== null;
    const overlayButton = (label: string): HTMLButtonElement =>
      Array.from(overlay().querySelectorAll('button')).find(b => b.textContent?.trim() === label) as HTMLButtonElement;

    async function settle(): Promise<void> {
      TestBed.inject(ApplicationRef).tick();
      await Promise.resolve();
      TestBed.inject(ApplicationRef).tick();
    }

    async function openRealDialog(config: MatDialogConfig = {}): Promise<void> {
      materialService = jasmine.createSpyObj<MaterialAdminService>('MaterialAdminService', ['importBoardVariantsCsv']);
      pending = new Subject<CsvImportResultResponse>();
      materialService.importBoardVariantsCsv.and.returnValue(pending as Observable<CsvImportResultResponse>);
      TestBed.configureTestingModule({
        imports: [NoopAnimationsModule],
        providers: [{ provide: MaterialAdminService, useValue: materialService }]
      });
      realRef = TestBed.inject(MatDialog).open(CsvImportDialogComponent, config);
      realComponent = realRef.componentInstance;
      afterClosed = jasmine.createSpy('afterClosed');
      realRef.afterClosed().subscribe(afterClosed);
      await settle();
    }

    async function startImport(): Promise<void> {
      const transfer = new DataTransfer();
      transfer.items.add(new File(['materialCode;thicknessMm'], 'warianty.csv', { type: 'text/csv' }));
      const input = overlay().querySelector('input[type="file"]') as HTMLInputElement;
      input.files = transfer.files;
      input.dispatchEvent(new Event('change'));
      await settle();
      overlayButton('Importuj').click();
      await settle();
    }

    async function pressEscape(): Promise<void> {
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true }));
      await settle();
      await new Promise(resolve => setTimeout(resolve));
    }

    async function clickBackdrop(): Promise<void> {
      (overlay().querySelector('.cdk-overlay-backdrop') as HTMLElement).click();
      await settle();
      await new Promise(resolve => setTimeout(resolve));
    }

    afterEach(() => TestBed.inject(MatDialog).closeAll());

    it('Escape podczas importu nie zamyka dialogu ani nie emituje afterClosed', async () => {
      await openRealDialog();
      await startImport();
      expect(realComponent.importing).toBeTrue();
      expect(overlayButton('Anuluj').disabled).toBeTrue();

      await pressEscape();

      expect(dialogOpen()).toBeTrue();
      expect(afterClosed).not.toHaveBeenCalled();
    });

    it('kliknięcie tła podczas importu nie zamyka dialogu ani nie emituje afterClosed', async () => {
      await openRealDialog();
      await startImport();
      expect(realComponent.importing).toBeTrue();

      await clickBackdrop();

      expect(dialogOpen()).toBeTrue();
      expect(afterClosed).not.toHaveBeenCalled();
    });

    it('onClose podczas importu nie zamyka dialogu', async () => {
      await openRealDialog();
      await startImport();

      realComponent.onClose();
      await settle();

      expect(dialogOpen()).toBeTrue();
      expect(afterClosed).not.toHaveBeenCalled();
    });

    it('ponowne onImport podczas importu nie wysyła drugiego POST', async () => {
      await openRealDialog();
      await startImport();

      realComponent.onImport();

      expect(materialService.importBoardVariantsCsv).toHaveBeenCalledTimes(1);
    });

    it('po odpowiedzi przywraca zamykanie: Escape zamyka dialog', async () => {
      await openRealDialog();
      await startImport();
      pending.next({ added: 1, updated: 0, errors: [] });
      await settle();
      expect(realComponent.importing).toBeFalse();
      expect(realRef.disableClose).toBeFalsy();

      await pressEscape();

      expect(dialogOpen()).toBeFalse();
      expect(afterClosed).toHaveBeenCalledTimes(1);
    });

    it('po odpowiedzi przywraca zamykanie: kliknięcie tła zamyka dialog', async () => {
      await openRealDialog();
      await startImport();
      pending.next({ added: 0, updated: 0, errors: [{ lineNumber: 2, line: 'x', message: 'Zły wiersz' }] });
      await settle();

      await clickBackdrop();

      expect(dialogOpen()).toBeFalse();
      expect(afterClosed).toHaveBeenCalledTimes(1);
    });

    it('częściowy sukces: ręczne Zamknij przekazuje true', async () => {
      await openRealDialog();
      await startImport();
      pending.next({ added: 1, updated: 1, errors: [{ lineNumber: 4, line: 'x', message: 'Zła cena' }] });
      await settle();

      overlayButton('Zamknij').click();
      await settle();
      await new Promise(resolve => setTimeout(resolve));

      expect(afterClosed).toHaveBeenCalledOnceWith(true);
    });

    it('same błędy odpowiedzi: ręczne Zamknij przekazuje false', async () => {
      await openRealDialog();
      await startImport();
      pending.next({ added: 0, updated: 0, errors: [{ lineNumber: 2, line: 'x', message: 'Zły wiersz' }] });
      await settle();

      overlayButton('Zamknij').click();
      await settle();
      await new Promise(resolve => setTimeout(resolve));

      expect(afterClosed).toHaveBeenCalledOnceWith(false);
    });

    it('błąd HTTP kończy importing, przywraca zamykanie i pozwala ponowić import', async () => {
      spyOn(console, 'error');
      await openRealDialog();
      await startImport();

      pending.error({ error: { message: 'Brak uprawnień' } });
      await settle();

      expect(realComponent.importing).toBeFalse();
      expect(overlay().querySelector('mat-spinner')).toBeNull();
      expect(realRef.disableClose).toBeFalsy();
      expect(overlayButton('Importuj').disabled).toBeFalse();

      await pressEscape();
      expect(dialogOpen()).toBeFalse();
    });




    it('sukces + Escape: dialog zamyka się z undefined, ale zapamiętuje potwierdzony zapis', async () => {
      await openRealDialog();
      await startImport();
      expect(realComponent.importConfirmed).toBeFalse();
      pending.next({ added: 1, updated: 0, errors: [] });
      await settle();
      expect(realComponent.importConfirmed).toBeTrue();

      await pressEscape();

      expect(dialogOpen()).toBeFalse();
      expect(afterClosed).toHaveBeenCalledOnceWith(undefined);
      expect(realComponent.importConfirmed).toBeTrue();
    });

    it('sukces + tło: potwierdzony zapis zostaje dostępny po zamknięciu', async () => {
      await openRealDialog();
      await startImport();
      pending.next({ added: 0, updated: 2, errors: [] });
      await settle();

      await clickBackdrop();

      expect(dialogOpen()).toBeFalse();
      expect(realComponent.importConfirmed).toBeTrue();
    });

    it('częściowy sukces + Escape: potwierdzenie zostaje mimo błędów wierszy', async () => {
      await openRealDialog();
      await startImport();
      pending.next({ added: 1, updated: 1, errors: [{ lineNumber: 4, line: 'x', message: 'Zła cena' }] });
      await settle();

      await pressEscape();

      expect(realComponent.importConfirmed).toBeTrue();
    });

    it('same błędy wierszy + Escape: brak potwierdzenia zapisu', async () => {
      await openRealDialog();
      await startImport();
      pending.next({ added: 0, updated: 0, errors: [{ lineNumber: 2, line: 'x', message: 'Zły wiersz' }] });
      await settle();

      await pressEscape();

      expect(realComponent.importConfirmed).toBeFalse();
    });

    it('błąd HTTP + Escape: brak potwierdzenia zapisu', async () => {
      spyOn(console, 'error');
      await openRealDialog();
      await startImport();
      pending.error({ status: 500 });
      await settle();

      await pressEscape();

      expect(realComponent.importConfirmed).toBeFalse();
    });

    it('podczas POST brak potwierdzenia, a Escape nie zamyka dialogu', async () => {
      await openRealDialog();
      await startImport();

      await pressEscape();

      expect(realComponent.importConfirmed).toBeFalse();
      expect(dialogOpen()).toBeTrue();
    });

    it('potwierdzenie przeżywa wyczyszczenie wyniku nowym plikiem i kolejny błąd HTTP', async () => {
      spyOn(console, 'error');
      await openRealDialog();
      await startImport();
      pending.next({ added: 1, updated: 0, errors: [] });
      await settle();
      expect(realComponent.importConfirmed).toBeTrue();

      const next = new Subject<CsvImportResultResponse>();
      materialService.importBoardVariantsCsv.and.returnValue(next as Observable<CsvImportResultResponse>);
      const file = new File(['x'], 'drugi.csv', { type: 'text/csv' });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.createElement('input');
      input.type = 'file';
      input.files = transfer.files;
      realComponent.onFileSelected({ target: input } as unknown as Event);
      expect(realComponent.importResult).toBeNull();
      realComponent.onImport();
      next.error({ status: 500 });
      await settle();

      expect(realComponent.importConfirmed).toBeTrue();
    });

    it('bez importu Escape zamyka dialog', async () => {
      await openRealDialog();
      await pressEscape();
      expect(dialogOpen()).toBeFalse();
      expect(afterClosed).toHaveBeenCalledTimes(1);
    });

    it('bez importu kliknięcie tła zamyka dialog', async () => {
      await openRealDialog();
      await clickBackdrop();
      expect(dialogOpen()).toBeFalse();
      expect(afterClosed).toHaveBeenCalledTimes(1);
    });

    it('disableClose=true ustawione przez wywołującego zostaje po odpowiedzi', async () => {
      await openRealDialog({ disableClose: true });
      await startImport();
      expect(realRef.disableClose).toBeTrue();

      pending.next({ added: 1, updated: 0, errors: [] });
      await settle();
      expect(realRef.disableClose).toBeTrue();

      await pressEscape();
      expect(dialogOpen()).toBeTrue();
    });

    it('disableClose=true ustawione przez wywołującego zostaje po błędzie HTTP', async () => {
      spyOn(console, 'error');
      await openRealDialog({ disableClose: true });
      await startImport();

      pending.error({ status: 500 });
      await settle();

      expect(realRef.disableClose).toBeTrue();
    });
  });
});
