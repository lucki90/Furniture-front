import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject, of, throwError } from 'rxjs';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { KitchenPagePricingService } from './kitchen-page-pricing.service';
import { KitchenStateService } from './kitchen-state.service';
import { KitchenProjectPricingFacade } from './kitchen-project-pricing.facade';
import { KitchenProjectExportFacade } from './kitchen-project-export.facade';
import { ToastService } from '../../core/error/toast.service';

const SAMPLE_LOAD_RESULT = {
  breakdown: { finalPrice: 1500, discountPct: 10, offerNotes: 'testowa oferta', manualPriceOverride: null } as any,
  formState: { discountPct: 10, manualOverrideEnabled: false, manualOverride: null, offerNotes: 'testowa oferta' }
};

const NEWER_LOAD_RESULT = {
  breakdown: { finalPrice: 2400, discountPct: 5, offerNotes: 'nowsza oferta', manualPriceOverride: null } as any,
  formState: { discountPct: 5, manualOverrideEnabled: false, manualOverride: null, offerNotes: 'nowsza oferta' }
};

describe('KitchenPagePricingService', () => {
  let service: KitchenPagePricingService;
  let pricingFacade: jasmine.SpyObj<KitchenProjectPricingFacade>;
  let exportFacade: jasmine.SpyObj<KitchenProjectExportFacade>;
  let toast: jasmine.SpyObj<ToastService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let projectId = signal<number | null>(1);

  beforeEach(() => {
    pricingFacade = jasmine.createSpyObj('KitchenProjectPricingFacade', ['loadPricing', 'savePricing', 'downloadOfferPdf']);
    exportFacade = jasmine.createSpyObj('KitchenProjectExportFacade', ['downloadOfferPdf', 'getBomPriceWarning', 'exportExcel']);
    toast = jasmine.createSpyObj('ToastService', ['warning', 'success', 'error']);

    const dialogRefSpy = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(null));
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    dialog.open.and.returnValue(dialogRefSpy);

    TestBed.configureTestingModule({
      imports: [MatDialogModule, NoopAnimationsModule],
      providers: [
        KitchenPagePricingService,
        { provide: KitchenStateService, useValue: { currentProjectId: projectId } },
        { provide: KitchenProjectPricingFacade, useValue: pricingFacade },
        { provide: KitchenProjectExportFacade, useValue: exportFacade },
        { provide: ToastService, useValue: toast },
        { provide: MatDialog, useValue: dialog }
      ]
    });

    projectId.set(1);
    service = TestBed.inject(KitchenPagePricingService);
  });

  describe('loadPricing', () => {
    it('nie wywołuje API gdy brak projectId', () => {
      projectId.set(null);
      service.loadPricing();
      expect(pricingFacade.loadPricing).not.toHaveBeenCalled();
    });

    it('ustawia isPricingLoading=true podczas ładowania', () => {
      const subject$ = new Subject<any>();
      pricingFacade.loadPricing.and.returnValue(subject$.asObservable());

      service.loadPricing();

      expect(service.isPricingLoading()).toBeTrue();
    });

    it('po sukcesie stosuje wynik i czyści loading', () => {
      pricingFacade.loadPricing.and.returnValue(of(SAMPLE_LOAD_RESULT));

      service.loadPricing();

      expect(service.isPricingLoading()).toBeFalse();
      expect(service.pricing()?.finalPrice).toBe(1500);
      expect(service.pricingDiscountPct()).toBe(10);
      expect(service.pricingOfferNotes()).toBe('testowa oferta');
    });

    it('po błędzie czyści isPricingLoading', () => {
      pricingFacade.loadPricing.and.returnValue(throwError(() => new Error('błąd sieci')));

      service.loadPricing();

      expect(service.isPricingLoading()).toBeFalse();
    });

    it('reset anuluje oczekujące ładowanie i nie nadpisuje stanu wyceny', () => {
      const subject$ = new Subject<any>();
      pricingFacade.loadPricing.and.returnValue(subject$.asObservable());

      service.loadPricing();
      expect(service.isPricingLoading()).toBeTrue();

      service.reset();
      subject$.next(SAMPLE_LOAD_RESULT);

      expect(service.pricing()).toBeNull();
      expect(service.isPricingLoading()).toBeFalse();
    });

    it('nowsze ładowanie anuluje starsze i jako jedyne aktualizuje stan', () => {
      const olderRequest$ = new Subject<any>();
      const newerRequest$ = new Subject<any>();
      pricingFacade.loadPricing.and.returnValues(
        olderRequest$.asObservable(),
        newerRequest$.asObservable()
      );

      service.loadPricing();
      service.loadPricing();

      olderRequest$.next(SAMPLE_LOAD_RESULT);
      olderRequest$.complete();
      expect(service.pricing()).toBeNull();
      expect(service.isPricingLoading()).toBeTrue();

      newerRequest$.next(NEWER_LOAD_RESULT);
      newerRequest$.complete();
      expect(service.pricing()?.finalPrice).toBe(2400);
      expect(service.pricingOfferNotes()).toBe('nowsza oferta');
      expect(service.isPricingLoading()).toBeFalse();
    });
  });

  describe('savePricing', () => {
    it('nie wywołuje API gdy brak projectId', () => {
      projectId.set(null);
      service.savePricing();
      expect(pricingFacade.savePricing).not.toHaveBeenCalled();
    });

    it('przekazuje aktualny stan formularza do API', () => {
      pricingFacade.savePricing.and.returnValue(of(SAMPLE_LOAD_RESULT));
      service.setDiscountPct(15);
      service.setManualOverrideEnabled(true);
      service.setManualOverride(800);
      service.setOfferNotes('notatka');

      service.savePricing();

      expect(pricingFacade.savePricing).toHaveBeenCalledWith(1, jasmine.objectContaining({
        discountPct: 15,
        manualOverrideEnabled: true,
        manualOverride: 800,
        offerNotes: 'notatka'
      }));
    });

    it('po błędzie czyści isPricingSaving', () => {
      pricingFacade.savePricing.and.returnValue(throwError(() => new Error('błąd')));

      service.savePricing();

      expect(service.isPricingSaving()).toBeFalse();
    });

    it('nowszy zapis anuluje starszy i jako jedyny aktualizuje stan', () => {
      const olderRequest$ = new Subject<any>();
      const newerRequest$ = new Subject<any>();
      pricingFacade.savePricing.and.returnValues(
        olderRequest$.asObservable(),
        newerRequest$.asObservable()
      );

      service.savePricing();
      service.savePricing();

      olderRequest$.next(SAMPLE_LOAD_RESULT);
      olderRequest$.complete();
      expect(service.pricing()).toBeNull();
      expect(service.isPricingSaving()).toBeTrue();

      newerRequest$.next(NEWER_LOAD_RESULT);
      newerRequest$.complete();
      expect(service.pricing()?.finalPrice).toBe(2400);
      expect(service.pricingOfferNotes()).toBe('nowsza oferta');
      expect(service.isPricingSaving()).toBeFalse();
    });
  });

  describe('downloadOfferPdf', () => {
    it('nie otwiera dialogu gdy brak projectId', () => {
      projectId.set(null);
      service.downloadOfferPdf(null);
      expect(dialog.open).not.toHaveBeenCalled();
    });

    it('pokazuje ostrzeżenie o cenach BOM gdy podano', () => {
      service.downloadOfferPdf('Brak cen w katalogu dla 3 pozycji');
      expect(toast.warning).toHaveBeenCalledWith('Brak cen w katalogu dla 3 pozycji');
    });

    it('nie pokazuje ostrzeżenia gdy brak komunikatu', () => {
      service.downloadOfferPdf(null);
      expect(toast.warning).not.toHaveBeenCalled();
    });

    it('otwiera dialog opcji oferty', () => {
      service.downloadOfferPdf(null);
      expect(dialog.open).toHaveBeenCalled();
    });

    it('nie pobiera PDF gdy dialog anulowany (afterClosed→null)', () => {
      service.downloadOfferPdf(null);
      expect(exportFacade.downloadOfferPdf).not.toHaveBeenCalled();
    });

    it('po akceptacji dialogu wywołuje eksport PDF i czyści isPdfDownloading', () => {
      const options = { showCostDetails: true, frontDescription: '', countertopDescription: '', hardwareDescription: 'Blum' };
      const pdfDialogRef = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
      pdfDialogRef.afterClosed.and.returnValue(of(options));
      dialog.open.and.returnValue(pdfDialogRef);
      exportFacade.downloadOfferPdf.and.returnValue(of(undefined as any));

      service.downloadOfferPdf(null);

      expect(exportFacade.downloadOfferPdf).toHaveBeenCalledWith(jasmine.objectContaining({ projectId: 1, options }));
      expect(service.isPdfDownloading()).toBeFalse();
    });

    it('po błędzie eksportu PDF czyści isPdfDownloading', () => {
      const options = { showCostDetails: true, frontDescription: '', countertopDescription: '', hardwareDescription: 'Blum' };
      const pdfDialogRef = jasmine.createSpyObj<MatDialogRef<any>>('MatDialogRef', ['afterClosed']);
      pdfDialogRef.afterClosed.and.returnValue(of(options));
      dialog.open.and.returnValue(pdfDialogRef);
      exportFacade.downloadOfferPdf.and.returnValue(throwError(() => new Error('błąd eksportu')));

      service.downloadOfferPdf(null);

      expect(service.isPdfDownloading()).toBeFalse();
    });
  });

  describe('reset', () => {
    it('zeruje wszystkie sygnały wyceny', () => {
      service.setDiscountPct(20);
      service.setManualOverrideEnabled(true);
      service.setManualOverride(500);
      service.setOfferNotes('xyz');
      pricingFacade.loadPricing.and.returnValue(of(SAMPLE_LOAD_RESULT));
      service.loadPricing();

      service.reset();

      expect(service.pricing()).toBeNull();
      expect(service.isPricingLoading()).toBeFalse();
      expect(service.isPricingSaving()).toBeFalse();
      expect(service.isPdfDownloading()).toBeFalse();
      expect(service.pricingDiscountPct()).toBe(0);
      expect(service.pricingManualOverrideEnabled()).toBeFalse();
      expect(service.pricingManualOverride()).toBeNull();
      expect(service.pricingOfferNotes()).toBe('');
    });
  });

  describe('settery', () => {
    it('setDiscountPct aktualizuje sygnał', () => {
      service.setDiscountPct(12);
      expect(service.pricingDiscountPct()).toBe(12);
    });

    it('setManualOverride aktualizuje sygnał', () => {
      service.setManualOverride(999);
      expect(service.pricingManualOverride()).toBe(999);

      service.setManualOverride(null);
      expect(service.pricingManualOverride()).toBeNull();
    });

    it('setManualOverrideEnabled aktualizuje sygnał', () => {
      service.setManualOverrideEnabled(true);
      expect(service.pricingManualOverrideEnabled()).toBeTrue();
    });

    it('setOfferNotes aktualizuje sygnał', () => {
      service.setOfferNotes('nowa notatka');
      expect(service.pricingOfferNotes()).toBe('nowa notatka');
    });
  });
});
