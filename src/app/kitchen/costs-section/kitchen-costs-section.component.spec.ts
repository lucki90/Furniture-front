import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KitchenCostsSectionComponent } from './kitchen-costs-section.component';

describe('KitchenCostsSectionComponent', () => {
  let component: KitchenCostsSectionComponent;
  let fixture: ComponentFixture<KitchenCostsSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitchenCostsSectionComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(KitchenCostsSectionComponent);
    component = fixture.componentInstance;
  });

  it('renders pre-calculation summary and emits actions', () => {
    spyOn(component.calculateProject, 'emit');
    spyOn(component.clearAll, 'emit');
    component.totalCabinetCount = 3;
    component.selectedWallLabel = 'Sciana glowna';
    component.selectedWallCabinetCount = 2;
    component.totalWidth = 1800;
    component.remainingWidth = 1200;
    component.selectedWallTotalCost = 2500;
    component.wallsCount = 2;
    component.totalCost = 4800;

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Sciana glowna');
    expect(text).toContain('Wylicz projekt');

    const buttons = fixture.nativeElement.querySelectorAll('.calculation-prompt button');
    (buttons[0] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();

    expect(component.calculateProject.emit).toHaveBeenCalled();
    expect(component.clearAll.emit).toHaveBeenCalled();
  });

  it('emits pricing tab request when pricing tab is selected', () => {
    spyOn(component.activeDetailsTabChange, 'emit');
    spyOn(component.pricingTabRequested, 'emit');
    component.projectResult = {
      allFit: true,
      wallCount: 1,
      totalCabinetCount: 2,
      walls: [{
        wallType: 'MAIN',
        widthMm: 3600,
        heightMm: 2600,
        fits: true,
        wallTotalCost: 1200,
        cabinetCount: 2,
        usedWidthBottom: 1200,
        usedWidthTop: 800
      }]
    } as any;
    component.currentProjectId = 10;

    fixture.detectChanges();

    const pricingTab = Array.from(
      fixture.nativeElement.querySelectorAll('.tab-btn') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.includes('Wycena')) as HTMLButtonElement;

    pricingTab.click();

    expect(component.activeDetailsTabChange.emit).toHaveBeenCalledWith('pricing');
    expect(component.pricingTabRequested.emit).toHaveBeenCalled();
  });

  it('emits pricing form changes and save action', () => {
    spyOn(component.pricingDiscountPctChange, 'emit');
    spyOn(component.pricingManualOverrideEnabledChange, 'emit');
    spyOn(component.pricingOfferNotesChange, 'emit');
    spyOn(component.savePricing, 'emit');
    component.projectResult = {
      allFit: true,
      wallCount: 1,
      totalCabinetCount: 2,
      walls: []
    } as any;
    component.currentProjectId = 10;
    component.activeDetailsTab = 'pricing';
    component.pricing = {
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
      finalPrice: 192.5,
      offerNotes: 'Test',
      subtotal: 192.5,
      discountPct: 0,
      discountAmount: 0,
      afterDiscount: 192.5,
      manualPriceOverride: null
    } as any;

    fixture.detectChanges();

    const inputs = fixture.nativeElement.querySelectorAll('.pricing-grid input');
    const textarea = fixture.nativeElement.querySelector('.pricing-notes textarea') as HTMLTextAreaElement;
    const saveButton = fixture.nativeElement.querySelector('.pricing-actions button') as HTMLButtonElement;

    (inputs[0] as HTMLInputElement).value = '12';
    inputs[0].dispatchEvent(new Event('input'));
    (inputs[1] as HTMLInputElement).click();
    textarea.value = 'Nowa notatka';
    textarea.dispatchEvent(new Event('input'));
    saveButton.click();

    expect(component.pricingDiscountPctChange.emit).toHaveBeenCalledWith(12);
    expect(component.pricingManualOverrideEnabledChange.emit).toHaveBeenCalled();
    expect(component.pricingOfferNotesChange.emit).toHaveBeenCalledWith('Nowa notatka');
    expect(component.savePricing.emit).toHaveBeenCalled();
  });

  it('renders empty boards tab state when there are no aggregated boards', () => {
    component.projectResult = {
      allFit: true,
      wallCount: 1,
      totalCabinetCount: 1,
      walls: []
    } as any;
    component.activeDetailsTab = 'boards';
    component.aggregatedBoards = [];

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Brak płyt do wyświetlenia');
  });
});
