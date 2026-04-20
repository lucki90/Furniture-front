import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { KitchenWorkspaceSectionComponent } from './kitchen-workspace-section.component';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';

describe('KitchenWorkspaceSectionComponent', () => {
  let component: KitchenWorkspaceSectionComponent;
  let fixture: ComponentFixture<KitchenWorkspaceSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitchenWorkspaceSectionComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(KitchenWorkspaceSectionComponent);
    component = fixture.componentInstance;
  });

  it('renders selected wall dimensions and front view header', () => {
    component.hasSelectedWall = true;
    component.selectedWallLabel = 'Sciana glowna';
    component.wallLength = 3600;
    component.wallHeight = 2600;

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Sciana glowna:');
    expect(text).toContain('Sciana glowna - 3600x2600 mm');
  });

  it('emits add wall and cancel edit actions', () => {
    spyOn(component.addWallRequested, 'emit');
    spyOn(component.cancelEdit, 'emit');
    component.editingCabinet = {
      id: 'cab-1',
      type: KitchenCabinetType.BASE_ONE_DOOR,
      openingType: 'HANDLE',
      width: 600,
      height: 720,
      depth: 560,
      positionY: 0,
      shelfQuantity: 1
    } as any;

    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.panel-header button');
    (buttons[0] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();

    expect(component.addWallRequested.emit).toHaveBeenCalled();
    expect(component.cancelEdit.emit).toHaveBeenCalled();
  });

  it('emits wall dimension updates from inputs', () => {
    spyOn(component.wallLengthChange, 'emit');
    spyOn(component.wallHeightChange, 'emit');
    component.hasSelectedWall = true;

    fixture.detectChanges();

    const inputs = fixture.nativeElement.querySelectorAll('.wall-dimensions-bar input');
    const lengthInput = inputs[0] as HTMLInputElement;
    const heightInput = inputs[1] as HTMLInputElement;

    lengthInput.value = '4200';
    lengthInput.dispatchEvent(new Event('input'));
    heightInput.value = '2750';
    heightInput.dispatchEvent(new Event('input'));

    expect(component.wallLengthChange.emit).toHaveBeenCalledWith(4200);
    expect(component.wallHeightChange.emit).toHaveBeenCalledWith(2750);
  });
});
