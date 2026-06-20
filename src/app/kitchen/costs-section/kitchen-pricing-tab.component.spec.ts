import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { KitchenPricingTabComponent } from './kitchen-pricing-tab.component';
import { PricingBreakdown } from '../service/project-pricing.service';

const SAMPLE_PRICING: PricingBreakdown = {
  boardsNet: 100,
  markupMaterialsPct: 10,
  boardsMarkupAmount: 10,
  boardsTotal: 110,
  componentsNet: 50,
  markupComponentsPct: 10,
  componentsMarkupAmount: 5,
  componentsTotal: 55,
  jobsNet: 25,
  markupJobsPct: 10,
  jobsMarkupAmount: 2.5,
  jobsTotal: 27.5,
  subtotal: 192.5,
  discountPct: 0,
  discountAmount: 0,
  afterDiscount: 192.5,
  finalPrice: 192.5,
  offerNotes: '',
  manualPriceOverride: null
} as PricingBreakdown;

describe('KitchenPricingTabComponent', () => {
  let component: KitchenPricingTabComponent;
  let fixture: ComponentFixture<KitchenPricingTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitchenPricingTabComponent, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(KitchenPricingTabComponent);
    component = fixture.componentInstance;
  });

  it('pokazuje komunikat ładowania gdy isPricingLoading = true', () => {
    component.isPricingLoading = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Ładowanie wyceny');
  });

  it('pokazuje wskazówkę gdy pricing = null i nie trwa ładowanie', () => {
    component.isPricingLoading = false;
    component.pricing = null;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Kliknij zakładkę Wycena');
  });

  it('wyświetla tabelę z kwotami po dostarczeniu danych wyceny', () => {
    component.pricing = SAMPLE_PRICING;
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Płyty');
    expect(text).toContain('110.00 zł');
    expect(text).toContain('Cena końcowa');
    expect(text).toContain('192.50 zł');
  });

  it('emituje pricingDiscountPctChange po zmianie pola Rabat', () => {
    spyOn(component.pricingDiscountPctChange, 'emit');
    component.pricing = SAMPLE_PRICING;
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('.pricing-fields input[type="number"]') as HTMLInputElement;
    input.value = '15';
    input.dispatchEvent(new Event('input'));

    expect(component.pricingDiscountPctChange.emit).toHaveBeenCalledWith(15);
  });

  it('emituje pricingManualOverrideEnabledChange po kliknięciu checkboxa Nadpisz cenę', () => {
    spyOn(component.pricingManualOverrideEnabledChange, 'emit');
    component.pricing = SAMPLE_PRICING;
    fixture.detectChanges();

    const checkbox = fixture.nativeElement.querySelector('.pricing-fields input[type="checkbox"]') as HTMLInputElement;
    checkbox.click();

    expect(component.pricingManualOverrideEnabledChange.emit).toHaveBeenCalled();
  });

  it('emituje savePricing po kliknięciu przycisku Zapisz wycenę', () => {
    spyOn(component.savePricing, 'emit');
    component.pricing = SAMPLE_PRICING;
    fixture.detectChanges();

    const saveBtn = fixture.nativeElement.querySelector('.pricing-actions button') as HTMLButtonElement;
    saveBtn.click();

    expect(component.savePricing.emit).toHaveBeenCalled();
  });

  it('emituje downloadOfferPdf po kliknięciu przycisku Pobierz ofertę PDF', () => {
    spyOn(component.downloadOfferPdf, 'emit');
    component.pricing = SAMPLE_PRICING;
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.pricing-actions button') as NodeListOf<HTMLButtonElement>;
    buttons[1].click();

    expect(component.downloadOfferPdf.emit).toHaveBeenCalled();
  });

  it('wyświetla notatkę o ręcznym nadpisaniu ceny gdy manualPriceOverride != null', () => {
    component.pricing = { ...SAMPLE_PRICING, manualPriceOverride: 1500, afterDiscount: 1234.56 } as PricingBreakdown;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('nadpisana ręcznie');
    expect(fixture.nativeElement.textContent).toContain('1234.56');
  });
});
