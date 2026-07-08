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

    expect(fixture.nativeElement.textContent).toContain('Brak szafek na tej ścianie');
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

  it('hides technical drawing UI while the spike is paused', () => {
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

    expect(fixture.nativeElement.querySelector('app-cabinet-technical-drawing')).toBeNull();
    expect(fixture.nativeElement.querySelector('.technical-drawing-shell')).toBeNull();
    expect(fixture.nativeElement.querySelector('.cabinet-card-btn--drawing')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Rysunek techniczny');
  });

  it('does not render technical drawing tabs while the spike is paused', () => {
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

    expect(fixture.nativeElement.querySelectorAll('.technical-drawing-tab').length).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('800 x 718 x 536 mm');
  });

  it('does not show technical drawing empty state while the spike is paused', () => {
    fixture.componentRef.setInput('selectedWallLabel', 'Ściana główna');
    fixture.componentRef.setInput('selectedCabinetId', 'cab-empty');
    fixture.componentRef.setInput('cabinets', [
      cabinet('cab-drawable', 'Dolna', responseWithBoards([
        board('SIDE_NAME', 758, 536, 18, 2),
        board('WREATH_NAME', 536, 564, 18),
        board('FRONT_NAME', 752, 594, 18)
      ])),
      cabinet('cab-empty', 'Piekarnik wolnostojący', cabinetResponseFixture([]), KitchenCabinetType.BASE_OVEN_FREESTANDING)
    ]);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-cabinet-technical-drawing')).toBeNull();
    expect(fixture.nativeElement.querySelector('.technical-drawing-empty')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Wybrana szafka nie ma rysunku technicznego');
  });

  it('hides the drawing panel when selection is explicitly cleared', () => {
    fixture.componentRef.setInput('selectedWallLabel', 'Ściana główna');
    fixture.componentRef.setInput('selectedCabinetId', null);
    fixture.componentRef.setInput('cabinets', [
      cabinet('cab-drawable', 'Dolna', responseWithBoards([
        board('SIDE_NAME', 758, 536, 18, 2),
        board('WREATH_NAME', 536, 564, 18),
        board('FRONT_NAME', 752, 594, 18)
      ]))
    ]);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-cabinet-technical-drawing')).toBeNull();
    expect(fixture.nativeElement.querySelector('.technical-drawing-shell')).toBeNull();
  });

  it('does not emit drawing selection when a cabinet card is clicked while drawings are hidden', () => {
    spyOn(component.selectCabinet, 'emit');
    fixture.componentRef.setInput('selectedWallLabel', 'Ściana główna');
    fixture.componentRef.setInput('cabinets', [
      cabinet('cab-1', 'Pierwsza', responseWithBoards([
        board('SIDE_NAME', 758, 536, 18, 2),
        board('WREATH_NAME', 536, 564, 18)
      ])),
      cabinet('cab-empty', 'Piekarnik wolnostojący', cabinetResponseFixture([]), KitchenCabinetType.BASE_OVEN_FREESTANDING)
    ]);

    fixture.detectChanges();

    const cards = Array.from(fixture.nativeElement.querySelectorAll('.cabinet-card')) as HTMLElement[];
    cards[1].click();

    expect(component.selectCabinet.emit).not.toHaveBeenCalled();
  });

  it('keeps drawing tab fallback labels hidden while the spike is paused', () => {
    fixture.componentRef.setInput('selectedWallLabel', 'Ściana główna');
    fixture.componentRef.setInput('cabinets', [
      cabinet('cab-1', '', responseWithBoards([
        board('SIDE_NAME', 758, 536, 18, 2),
        board('WREATH_NAME', 536, 564, 18)
      ])),
      cabinet('cab-2', '', responseWithBoards([
        board('SIDE_NAME', 718, 536, 18, 2),
        board('WREATH_NAME', 536, 764, 18)
      ]))
    ]);

    fixture.detectChanges();

    const tabs = Array.from(
      fixture.nativeElement.querySelectorAll('.technical-drawing-tab span')
    ) as HTMLSpanElement[];

    expect(tabs).toEqual([]);
  });
});

function cabinet(
  id: string,
  name: string,
  calculationResponse: any,
  type: KitchenCabinetType = KitchenCabinetType.BASE_ONE_DOOR
) {
  return {
    id,
    name,
    type,
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

