import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { KitchenPagePricingService } from './kitchen-page-pricing.service';
import { KitchenStateService } from './kitchen-state.service';
import { KitchenProjectPricingFacade } from './kitchen-project-pricing.facade';
import { KitchenProjectExportFacade } from './kitchen-project-export.facade';
import { ToastService } from '../../core/error/toast.service';
import { OfferViewsService } from '../offer-views/offer-views.service';
import { OfferDialogOptions } from '../offer-options-dialog/offer-options-dialog.component';
import { OfferViewImage } from './project-pricing.service';

const VIEWS: OfferViewImage[] = [
  { title: 'Rzut z góry', pngBase64: 'iVBORw0KGgo=' },
  { title: 'Ściana główna — 3600 × 2600 mm', pngBase64: 'iVBORw0KGgo=' }
];

const DOWNLOAD = { blob: new Blob(['pdf']), filename: 'oferta.pdf', generatedAt: null, fileSizeBytes: 3 };

describe('KitchenPagePricingService — widoki poglądowe w ofercie', () => {
  let service: KitchenPagePricingService;
  let exportFacade: jasmine.SpyObj<KitchenProjectExportFacade>;
  let offerViews: jasmine.SpyObj<OfferViewsService>;
  let toast: jasmine.SpyObj<ToastService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  const hasUnsavedChanges = signal(false);

  beforeEach(() => {
    exportFacade = jasmine.createSpyObj('KitchenProjectExportFacade', ['downloadOfferPdf']);
    exportFacade.downloadOfferPdf.and.returnValue(of(DOWNLOAD));
    offerViews = jasmine.createSpyObj('OfferViewsService', ['render']);
    toast = jasmine.createSpyObj('ToastService', ['warning', 'success', 'error']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    hasUnsavedChanges.set(false);

    TestBed.configureTestingModule({
      providers: [
        KitchenPagePricingService,
        { provide: KitchenStateService, useValue: { currentProjectId: signal(1), hasUnsavedChanges } },
        { provide: KitchenProjectPricingFacade, useValue: jasmine.createSpyObj('KitchenProjectPricingFacade', ['loadPricing']) },
        { provide: KitchenProjectExportFacade, useValue: exportFacade },
        { provide: OfferViewsService, useValue: offerViews },
        { provide: ToastService, useValue: toast },
        { provide: MatDialog, useValue: dialog }
      ]
    });
    service = TestBed.inject(KitchenPagePricingService);
  });

  function closeDialogWith(options: OfferDialogOptions): void {
    const dialogRef = jasmine.createSpyObj<MatDialogRef<unknown>>('MatDialogRef', ['afterClosed']);
    dialogRef.afterClosed.and.returnValue(of(options));
    dialog.open.and.returnValue(dialogRef);
  }

  const OPTIONS: OfferDialogOptions = { showCostDetails: true, hardwareDescription: 'Blum', includeViews: true };

  it('z widokami: rysuje je i wysyła z opcjami oferty (bez flagi okna)', async () => {
    offerViews.render.and.resolveTo(VIEWS);
    closeDialogWith(OPTIONS);

    service.downloadOfferPdf(null);
    await offerViews.render.calls.mostRecent().returnValue;
    await Promise.resolve();

    expect(exportFacade.downloadOfferPdf).toHaveBeenCalledWith({
      projectId: 1,
      options: { showCostDetails: true, hardwareDescription: 'Blum', views: VIEWS }
    });
    expect(toast.warning).not.toHaveBeenCalled();
    expect(service.isPdfDownloading()).toBeFalse();
  });

  it('bez widoków: nie rysuje i wysyła same opcje', () => {
    closeDialogWith({ ...OPTIONS, includeViews: false });

    service.downloadOfferPdf(null);

    expect(offerViews.render).not.toHaveBeenCalled();
    expect(exportFacade.downloadOfferPdf).toHaveBeenCalledWith({
      projectId: 1,
      options: { showCostDetails: true, hardwareDescription: 'Blum' }
    });
  });

  it('błąd rysowania: ostrzeżenie i oferta bez widoków', async () => {
    offerViews.render.and.rejectWith(new Error('canvas'));
    closeDialogWith(OPTIONS);

    service.downloadOfferPdf(null);
    await expectAsync(offerViews.render.calls.mostRecent().returnValue).toBeRejected();
    await Promise.resolve();
    await Promise.resolve();

    expect(toast.warning).toHaveBeenCalledWith(
      'Nie udało się przygotować widoków poglądowych — oferta powstanie bez rysunków.');
    expect(exportFacade.downloadOfferPdf).toHaveBeenCalledWith({
      projectId: 1,
      options: { showCostDetails: true, hardwareDescription: 'Blum' }
    });
  });

  it('niezapisane zmiany: ostrzeżenie, że widoki pokażą stan edytora', async () => {
    hasUnsavedChanges.set(true);
    offerViews.render.and.resolveTo(VIEWS);
    closeDialogWith(OPTIONS);

    service.downloadOfferPdf(null);
    await offerViews.render.calls.mostRecent().returnValue;

    expect(toast.warning).toHaveBeenCalledWith(
      'Projekt ma niezapisane zmiany — widoki pokażą stan edytora, a cena zapisany projekt.');
  });

  it('pusta lista widoków (projekt bez szafek) nie dodaje pola views', async () => {
    offerViews.render.and.resolveTo([]);
    closeDialogWith(OPTIONS);

    service.downloadOfferPdf(null);
    await offerViews.render.calls.mostRecent().returnValue;
    await Promise.resolve();

    expect(exportFacade.downloadOfferPdf.calls.mostRecent().args[0].options).not.toEqual(
      jasmine.objectContaining({ views: jasmine.anything() }));
  });

  it('ponowne otwarcie okna przywraca poprzedni wybór widoków', () => {
    closeDialogWith({ ...OPTIONS, includeViews: false });
    service.downloadOfferPdf(null);
    closeDialogWith(OPTIONS);

    service.downloadOfferPdf(null);

    expect(dialog.open.calls.mostRecent().args[1]?.data).toEqual(jasmine.objectContaining({ includeViews: false }));
  });
});
