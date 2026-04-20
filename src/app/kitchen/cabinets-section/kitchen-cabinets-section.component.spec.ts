import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KitchenCabinetsSectionComponent } from './kitchen-cabinets-section.component';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';

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
    component.selectedWallLabel = 'Sciana glowna';

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Brak szafek na tej scianie');
  });

  it('renders summary and emits clear event when cabinets exist', () => {
    spyOn(component.clearSelectedWallCabinets, 'emit');
    component.result = {
      boards: [],
      components: [],
      jobs: [],
      summaryCosts: 1234,
      boardTotalCost: 0,
      componentTotalCost: 0,
      jobTotalCost: 0
    };
    component.cabinets = [{
      id: 'cab-1',
      type: KitchenCabinetType.BASE_ONE_DOOR,
      openingType: 'HANDLE',
      width: 600,
      height: 720,
      depth: 560,
      positionY: 0,
      shelfQuantity: 1
    } as any];
    component.selectedWallLabel = 'Sciana glowna';
    component.selectedWallTotalCost = 1500;
    component.totalCabinetCount = 1;
    component.totalCost = 1500;

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ostatnia szafka:');
    fixture.nativeElement.querySelector('.list-actions button').click();
    expect(component.clearSelectedWallCabinets.emit).toHaveBeenCalled();
  });
});
