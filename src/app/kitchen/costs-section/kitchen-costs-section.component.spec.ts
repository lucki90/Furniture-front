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
    expect(text).toContain('Wylicz');

    const buttons = fixture.nativeElement.querySelectorAll('.pre-calc-actions button');
    (buttons[0] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();

    expect(component.calculateProject.emit).toHaveBeenCalled();
    expect(component.clearAll.emit).toHaveBeenCalled();
  });

  it('etykieta szafki w diagnostyce: numer i nazwa z karty ściany, bez nich identyfikator albo typ', () => {
    component.cabinetLabels = new Map([['cabinet-1', { cabinet: '#1 „Zlewozmywak”', wall: 'Ściana główna' }]]);
    const summary = (cabinetId: string) => ({ cabinetId, kitchenCabinetType: 'BASE_SINK' } as never);

    expect(component.cabinetDiagLabel(summary('cabinet-1'))).toBe('#1 „Zlewozmywak”');
    expect(component.cabinetDiagLabel(summary('cabinet-7'))).toBe('cabinet-7');
    expect(component.cabinetDiagLabel(summary(''))).toBe('BASE_SINK');
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
      fixture.nativeElement.querySelectorAll('.pill-tab') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.includes('Wycena')) as HTMLButtonElement;

    pricingTab.click();

    expect(component.activeDetailsTabChange.emit).toHaveBeenCalledWith('pricing');
    expect(component.pricingTabRequested.emit).toHaveBeenCalled();
  });

  it('renders cutting pill and emits lazy layout request without changing details tab', () => {
    spyOn(component.cuttingTabRequested, 'emit');
    spyOn(component.activeDetailsTabChange, 'emit');
    component.projectResult = {
      allFit: true,
      wallCount: 1,
      totalCabinetCount: 1,
      walls: []
    } as any;
    component.activeDetailsTab = 'walls';

    fixture.detectChanges();

    const cuttingTab = Array.from(
      fixture.nativeElement.querySelectorAll('.pill-tab') as NodeListOf<HTMLButtonElement>
    ).find(button => button.textContent?.includes('Rozkrój')) as HTMLButtonElement;

    expect(cuttingTab).toBeTruthy();
    cuttingTab.click();

    expect(component.bomTab).toBe('cutting');
    expect(component.cuttingTabRequested.emit).toHaveBeenCalled();
    expect(component.activeDetailsTab).toBe('walls');
    expect(component.activeDetailsTabChange.emit).not.toHaveBeenCalled();
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

    const inputs = fixture.nativeElement.querySelectorAll('.pricing-fields input');
    const textarea = fixture.nativeElement.querySelector('.pricing-notes-field textarea') as HTMLTextAreaElement;
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

  it('zakładka płyt pokazuje czytelną etykietę, a bez niej klucz materiału', () => {
    component.projectResult = { allFit: true, wallCount: 1, totalCabinetCount: 1, walls: [] } as any;
    const board = { thickness: 38, width: 1200, height: 600, quantity: 1, unitCost: 100, totalCost: 100 };
    component.aggregatedBoards = [
      { ...board, material: 'BLAT_LAMINATE', boardLabel: 'Blat — laminat' },
      { ...board, material: 'Blenda górna', thickness: 18 }
    ];

    fixture.detectChanges();

    const names = Array.from(fixture.nativeElement.querySelectorAll('.bom-table tbody tr td:first-child') as NodeListOf<HTMLElement>)
      .map(cell => cell.textContent?.replace(/\s+/g, ' ').trim());
    expect(names).toEqual(['Blat — laminat (38mm)', 'Blenda górna (18mm)']);
  });

  it('renders sheet waste under boards and keeps it out of components', () => {
    component.projectResult = {
      allFit: true,
      wallCount: 1,
      totalCabinetCount: 1,
      walls: []
    } as any;
    component.aggregatedBoards = [{
      material: 'PŁYTA_MDF',
      thickness: 18,
      width: 600,
      height: 720,
      quantity: 1,
      unitCost: 80,
      totalCost: 80
    }];
    component.aggregatedComponents = [{
      name: 'Zawias',
      type: 'HINGE',
      quantity: 2,
      unitCost: 10,
      totalCost: 20
    }];
    component.wasteDetails = [{
      name: 'Odpad MDF',
      type: 'SHEET_WASTE',
      quantity: 1,
      unitCost: 15,
      totalCost: 15,
      isWaste: true
    }];

    fixture.detectChanges();

    const bomTabs = Array.from(
      fixture.nativeElement.querySelectorAll('.bom-panel .pill-tab') as NodeListOf<HTMLButtonElement>
    );
    const boardsTab = bomTabs.find(button => button.textContent?.includes('Płyty')) as HTMLButtonElement;
    const componentsTab = bomTabs.find(button => button.textContent?.includes('Komponenty')) as HTMLButtonElement;

    expect(boardsTab.textContent).toContain('2');
    expect(componentsTab.textContent).toContain('1');
    expect(fixture.nativeElement.querySelector('.waste-section').textContent).toContain('Odpad MDF');

    componentsTab.click();
    fixture.detectChanges();

    const componentsText = fixture.nativeElement.querySelector('.bom-scroll-area').textContent;
    expect(componentsText).toContain('Zawias');
    expect(componentsText).not.toContain('Odpad MDF');
  });

  it('adds selected sheet waste only to the boards total', () => {
    component.projectResult = {
      allFit: true,
      wallCount: 1,
      totalCabinetCount: 1,
      walls: []
    } as any;
    component.totalAggregatedBoardsCost = 100;
    component.totalAggregatedComponentsCost = 40;
    component.totalWasteCost = 15;
    component.wasteDetails = [{
      name: 'Odpad MDF',
      type: 'SHEET_WASTE',
      quantity: 1,
      unitCost: 15,
      totalCost: 15,
      isWaste: true
    }];

    fixture.detectChanges();

    let metrics = fixture.nativeElement.querySelectorAll('.summary-metric-value');
    expect(metrics[0].textContent).toContain('100');
    expect(metrics[1].textContent).toContain('40');
    expect(fixture.nativeElement.querySelector('.bom-total-value').textContent).toContain('100.00');

    fixture.componentRef.setInput('includeWasteCost', true);
    fixture.detectChanges();

    metrics = fixture.nativeElement.querySelectorAll('.summary-metric-value');
    expect(metrics[0].textContent).toContain('115');
    expect(metrics[1].textContent).toContain('40');
    expect(fixture.nativeElement.querySelector('.bom-total-value').textContent).toContain('115.00');
  });

  it('renders countertop and enclosure diagnostics in walls tab', () => {
    component.projectResult = {
      allFit: true,
      wallCount: 1,
      totalCabinetCount: 1,
      walls: [{
        wallType: 'MAIN',
        widthMm: 3600,
        heightMm: 2600,
        fits: true,
        wallTotalCost: 1200,
        cabinetCount: 1,
        usedWidthBottom: 600,
        usedWidthTop: 0,
        cabinets: [{
          cabinetId: 'base-1',
          cabinetType: 'BASE_ONE_DOOR',
          width: 600,
          height: 720,
          depth: 560,
          positionX: 0,
          positionY: 100,
          enclosureLeftOuterWidthMm: 18,
          enclosureRightOuterWidthMm: 50
        }],
        countertop: {
          enabled: true,
          totalLengthMm: 605,
          depthMm: 600,
          thicknessMm: 38,
          computedCountertopHeightMm: 858,
          maxBaseCorpusHeightMm: 720,
          segments: [],
          segmentCount: 1,
          wasSplit: false,
          components: [],
          totalMaterialCost: 0,
          totalCuttingCost: 0,
          totalEdgingCost: 0,
          totalComponentsCost: 0,
          totalCost: 100,
          materialType: 'LAMINATE'
        }
      }]
    } as any;
    component.activeDetailsTab = 'walls';

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('858');
    expect(text).toContain('720');
    expect(text).toContain('base-1');
    expect(text).toContain('18');
    expect(text).toContain('50');
  });
});
