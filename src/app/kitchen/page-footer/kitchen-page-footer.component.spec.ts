import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KitchenPageFooterComponent } from './kitchen-page-footer.component';

describe('KitchenPageFooterComponent', () => {
  let component: KitchenPageFooterComponent;
  let fixture: ComponentFixture<KitchenPageFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitchenPageFooterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(KitchenPageFooterComponent);
    component = fixture.componentInstance;
  });

  it('renders project summary in calculated mode', () => {
    component.totalCabinetCount = 4;
    component.adjustedTotalCost = 12345;
    component.projectResult = {
      wallCount: 2,
      totalCabinetCount: 4
    } as any;

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('12345 zl');
    expect(text).toContain('2 scian, 4 szafek');
  });

  it('emits footer actions', () => {
    spyOn(component.saveProject, 'emit');
    spyOn(component.calculateProject, 'emit');
    spyOn(component.clearAll, 'emit');
    spyOn(component.downloadExcel, 'emit');
    component.totalCabinetCount = 2;
    component.projectResult = {
      wallCount: 1,
      totalCabinetCount: 2
    } as any;

    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.footer-actions button');
    (buttons[0] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();
    (buttons[2] as HTMLButtonElement).click();
    (buttons[3] as HTMLButtonElement).click();

    expect(component.saveProject.emit).toHaveBeenCalled();
    expect(component.calculateProject.emit).toHaveBeenCalled();
    expect(component.clearAll.emit).toHaveBeenCalled();
    expect(component.downloadExcel.emit).toHaveBeenCalled();
  });
});
