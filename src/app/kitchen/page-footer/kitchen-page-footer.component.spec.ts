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
    component.wallsCount = 2;
    component.adjustedTotalCost = 12345;
    component.projectResult = {
      wallCount: 2,
      totalCabinetCount: 4
    } as any;

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('12345 zł');
    expect(text).toContain('Szafek');
    expect(text).toContain('Ścian');
    expect(text).toContain('Łącznie');
  });

  it('emits footer actions in aux + workflow order', () => {
    spyOn(component.saveProject, 'emit');
    spyOn(component.calculateProject, 'emit');
    spyOn(component.clearAll, 'emit');
    spyOn(component.downloadExcel, 'emit');
    component.totalCabinetCount = 2;
    component.wallsCount = 1;
    component.projectResult = {
      wallCount: 1,
      totalCabinetCount: 2
    } as any;

    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.footer-actions button');
    // Kolejność: Excel (warunkowy po lewej) / Wyczyść / Wylicz / Zapisz
    (buttons[0] as HTMLButtonElement).click();
    (buttons[1] as HTMLButtonElement).click();
    (buttons[2] as HTMLButtonElement).click();
    (buttons[3] as HTMLButtonElement).click();

    expect(component.downloadExcel.emit).toHaveBeenCalled();
    expect(component.clearAll.emit).toHaveBeenCalled();
    expect(component.calculateProject.emit).toHaveBeenCalled();
    expect(component.saveProject.emit).toHaveBeenCalled();
  });

  it('renders in empty state and keeps workflow actions disabled', () => {
    component.totalCabinetCount = 0;
    component.wallsCount = 1;
    component.projectResult = null;

    fixture.detectChanges();

    const footer = fixture.nativeElement.querySelector('.page-footer');
    const buttons = fixture.nativeElement.querySelectorAll('.footer-actions button');
    const text = fixture.nativeElement.textContent;

    expect(footer).not.toBeNull();
    expect(text).toContain('Szafek');
    expect(text).toContain('0');
    expect((buttons[0] as HTMLButtonElement).disabled).toBeTrue();
    expect((buttons[1] as HTMLButtonElement).disabled).toBeTrue();
    expect((buttons[2] as HTMLButtonElement).disabled).toBeTrue();
  });
});
