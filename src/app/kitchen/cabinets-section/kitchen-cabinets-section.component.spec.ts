import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KitchenCabinetsSectionComponent } from './kitchen-cabinets-section.component';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { boardFixture as board, cabinetResponseFixture } from '../technical-drawing/testing/board.fixture';

describe('KitchenCabinetsSectionComponent', () => {
  let component: KitchenCabinetsSectionComponent;
  let fixture: ComponentFixture<KitchenCabinetsSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitchenCabinetsSectionComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(KitchenCabinetsSectionComponent);
    component = fixture.componentInstance;
  });

  it('renders empty state when there are no cabinets', () => {
    fixture.componentRef.setInput('selectedWallLabel', 'Ściana główna');

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Brak szafek na tej scianie');
  });

  it('keeps clear action visible but disabled when there are no cabinets', () => {
    fixture.componentRef.setInput('selectedWallLabel', 'Ściana główna');

    fixture.detectChanges();

    const clearButton = fixture.nativeElement.querySelector('.list-actions button') as HTMLButtonElement;

    expect(clearButton).withContext('expected clear button placeholder to stay visible').not.toBeNull();
    expect(clearButton.disabled).toBeTrue();
  });

  it('renders summary badges even before the first calculation and keeps project-wall-last order', () => {
    fixture.componentRef.setInput('selectedWallLabel', 'Ściana główna');
    fixture.componentRef.setInput('totalCabinetCount', 0);
    fixture.componentRef.setInput('totalCost', 0);
    fixture.componentRef.setInput('selectedWallTotalCost', 0);

    fixture.detectChanges();

    const badges = Array.from(
      fixture.nativeElement.querySelectorAll('.summary-badge')
    ) as HTMLElement[];
    const labels = badges.map(badge => badge.textContent?.trim() ?? '');

    expect(labels.length).toBe(3);
    expect(labels[0]).toContain('Projekt:');
    expect(labels[1]).toContain('Ściana główna:');
    expect(labels[2]).toContain('Ostatnia szafka:');
    expect(labels[1]).toContain('0 szafek');
  });

  it('renders summary and emits clear event when cabinets exist', () => {
    spyOn(component.clearSelectedWallCabinets, 'emit');
    fixture.componentRef.setInput('result', cabinetResponseFixture([], {
      summaryCosts: 1234,
      boardTotalCost: 0,
      componentTotalCost: 0,
      jobTotalCost: 0
    }));
    fixture.componentRef.setInput('cabinets', [{
      id: 'cab-1',
      type: KitchenCabinetType.BASE_ONE_DOOR,
      openingType: 'HANDLE',
      width: 600,
      height: 720,
      depth: 560,
      positionY: 0,
      shelfQuantity: 1
    } as any]);
    fixture.componentRef.setInput('selectedWallLabel', 'Ściana główna');
    fixture.componentRef.setInput('selectedWallTotalCost', 1500);
    fixture.componentRef.setInput('totalCabinetCount', 1);
    fixture.componentRef.setInput('totalCost', 1500);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Projekt:');
    expect(fixture.nativeElement.textContent).toContain('Ściana główna:');
    expect(fixture.nativeElement.textContent).toContain('Ostatnia szafka:');
    const clearButton = fixture.nativeElement.querySelector('.list-actions button') as HTMLButtonElement;
    expect(clearButton.disabled).toBeFalse();
    clearButton.click();
    expect(component.clearSelectedWallCabinets.emit).toHaveBeenCalled();
  });

  it('renders technical drawing from the selected cabinet calculation response', () => {
    fixture.componentRef.setInput('selectedWallLabel', 'Ściana główna');
    fixture.componentRef.setInput('cabinets', [
      cabinet('cab-1', 'Pierwsza', responseWithBoards([
        board('SIDE_NAME', 758, 536, 18, 2),
        board('TOP_WREATH_NAME', 100, 564, 18, 2),
        board('WREATH_NAME', 536, 564, 18),
        board('HDF_NAME', 756, 596, 3),
        board('FRONT_NAME', 752, 594, 18)
      ]))
    ]);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-cabinet-technical-drawing')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Rysunek techniczny');
    expect(fixture.nativeElement.textContent).toContain('600 x 758 x 536 mm');
  });

  it('switches technical drawing between cabinet cards', () => {
    fixture.componentRef.setInput('selectedWallLabel', 'Ściana główna');
    fixture.componentRef.setInput('cabinets', [
      cabinet('cab-1', 'Pierwsza', responseWithBoards([
        board('SIDE_NAME', 758, 536, 18, 2),
        board('TOP_WREATH_NAME', 100, 564, 18, 2),
        board('WREATH_NAME', 536, 564, 18),
        board('HDF_NAME', 756, 596, 3),
        board('FRONT_NAME', 752, 594, 18)
      ])),
      cabinet('cab-2', 'Druga', responseWithBoards([
        board('SIDE_NAME', 718, 536, 18, 2),
        board('TOP_WREATH_NAME', 100, 764, 18, 2),
        board('WREATH_NAME', 536, 764, 18),
        board('HDF_NAME', 716, 796, 3),
        board('FRONT_NAME', 712, 394, 18, 2)
      ]))
    ]);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('800 x 718 x 536 mm');

    const tabs = Array.from(
      fixture.nativeElement.querySelectorAll('.technical-drawing-tab')
    ) as HTMLButtonElement[];
    tabs[0].click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('600 x 758 x 536 mm');
  });
});

function cabinet(id: string, name: string, calculationResponse: any) {
  return {
    id,
    name,
    type: KitchenCabinetType.BASE_ONE_DOOR,
    openingType: 'HANDLE',
    width: 600,
    height: 720,
    depth: 560,
    positionY: 0,
    shelfQuantity: 1,
    calculationResponse,
    calculatedResult: {
      totalCost: calculationResponse.summaryCosts,
      boardCosts: calculationResponse.boardTotalCost,
      componentCosts: calculationResponse.componentTotalCost,
      jobCosts: calculationResponse.jobTotalCost
    }
  } as any;
}

function responseWithBoards(boards: any[]) {
  return cabinetResponseFixture(boards, {
    summaryCosts: 1000,
    boardTotalCost: 700,
    componentTotalCost: 200,
    jobTotalCost: 100
  });
}

