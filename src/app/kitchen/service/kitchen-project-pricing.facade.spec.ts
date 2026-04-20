import { TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { KitchenProjectPricingFacade, buildPricingUpdateRequest, extractOfferPdfFilename, mapPricingBreakdownToFormState } from './kitchen-project-pricing.facade';
import { PricingBreakdown, ProjectPricingService } from './project-pricing.service';

describe('KitchenProjectPricingFacade', () => {
  let facade: KitchenProjectPricingFacade;
  let pricingService: jasmine.SpyObj<ProjectPricingService>;

  beforeEach(() => {
    pricingService = jasmine.createSpyObj<ProjectPricingService>('ProjectPricingService', [
      'getBreakdown',
      'updatePricing',
      'downloadOfferPdf'
    ]);

    TestBed.configureTestingModule({
      providers: [
        KitchenProjectPricingFacade,
        { provide: ProjectPricingService, useValue: pricingService }
      ]
    });

    facade = TestBed.inject(KitchenProjectPricingFacade);
  });

  it('should map breakdown to form state on load', (done) => {
    const breakdown = createBreakdown({
      discountPct: 12,
      manualPriceOverride: 999,
      offerNotes: 'uwagi'
    });
    pricingService.getBreakdown.and.returnValue(of(breakdown));

    facade.loadPricing(7).subscribe(result => {
      expect(result.breakdown).toBe(breakdown);
      expect(result.formState).toEqual({
        discountPct: 12,
        manualOverrideEnabled: true,
        manualOverride: 999,
        offerNotes: 'uwagi'
      });
      done();
    });
  });

  it('should build update request and map response on save', (done) => {
    pricingService.updatePricing.and.returnValue(of(createBreakdown({
      discountPct: 5,
      manualPriceOverride: null,
      offerNotes: null
    })));

    facade.savePricing(3, {
      discountPct: 5,
      manualOverrideEnabled: false,
      manualOverride: 1234,
      offerNotes: ''
    }).subscribe(result => {
      expect(pricingService.updatePricing).toHaveBeenCalledWith(3, {
        discountPct: 5,
        manualPriceOverride: null,
        offerNotes: null
      });
      expect(result.formState.manualOverrideEnabled).toBeFalse();
      done();
    });
  });

  it('should extract filename from download response', (done) => {
    const response = new HttpResponse<Blob>({
      body: new Blob(['pdf']),
      headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="moja-oferta.pdf"' })
    });
    pricingService.downloadOfferPdf.and.returnValue(of(response));

    facade.downloadOfferPdf(10, { showCostDetails: true }).subscribe(result => {
      expect(result.filename).toBe('moja-oferta.pdf');
      expect(result.blob).toEqual(jasmine.any(Blob));
      done();
    });
  });

  it('should expose pure pricing helpers', () => {
    expect(mapPricingBreakdownToFormState(createBreakdown({
      discountPct: 8,
      manualPriceOverride: 2000,
      offerNotes: 'x'
    }))).toEqual({
      discountPct: 8,
      manualOverrideEnabled: true,
      manualOverride: 2000,
      offerNotes: 'x'
    });

    expect(buildPricingUpdateRequest({
      discountPct: 4,
      manualOverrideEnabled: false,
      manualOverride: 123,
      offerNotes: ''
    })).toEqual({
      discountPct: 4,
      manualPriceOverride: null,
      offerNotes: null
    });

    expect(extractOfferPdfFilename('attachment; filename="plik.pdf"')).toBe('plik.pdf');
    expect(extractOfferPdfFilename(null)).toBe('oferta.pdf');
  });
});

function createBreakdown(overrides: Partial<PricingBreakdown>): PricingBreakdown {
  return {
    boardsNet: 0,
    markupMaterialsPct: 0,
    boardsMarkupAmount: 0,
    boardsTotal: 0,
    componentsNet: 0,
    markupComponentsPct: 0,
    componentsMarkupAmount: 0,
    componentsTotal: 0,
    jobsNet: 0,
    markupJobsPct: 0,
    jobsMarkupAmount: 0,
    jobsTotal: 0,
    subtotal: 0,
    discountPct: 0,
    discountAmount: 0,
    afterDiscount: 0,
    manualPriceOverride: null,
    finalPrice: 0,
    offerNotes: null,
    ...overrides
  };
}
