import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { KitchenPageHeaderComponent } from './kitchen-page-header.component';

describe('KitchenPageHeaderComponent', () => {
  let component: KitchenPageHeaderComponent;
  let fixture: ComponentFixture<KitchenPageHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitchenPageHeaderComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(KitchenPageHeaderComponent);
    component = fixture.componentInstance;
  });

  it('renders existing project metadata', () => {
    component.projectDisplayName = 'Projekt testowy';
    component.projectId = 42;
    component.projectVersion = 3;
    component.hasProjectId = true;
    component.projectStatusLabel = 'ROBOCZY';

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Projekt testowy');
    expect(text).toContain('#42');
    expect(text).toContain('v3');
    expect(text).toContain('ROBOCZY');
  });

  it('emits status change and resets select value', () => {
    spyOn(component.statusChange, 'emit');
    component.allowedTransitions = [{ value: 'SENT' as any, label: 'Wyslany' }];
    component.hasProjectId = true;

    fixture.detectChanges();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('.status-select');
    select.value = 'SENT';
    select.dispatchEvent(new Event('change'));

    expect(component.statusChange.emit).toHaveBeenCalledWith('SENT' as any);
    expect(select.value).toBe('');
  });

  it('emits view change when switching tabs', () => {
    spyOn(component.viewChange, 'emit');
    component.totalCabinetCount = 2;

    fixture.detectChanges();

    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.view-toggle-btn');
    buttons[1].click();

    expect(component.viewChange.emit).toHaveBeenCalledWith('costs');
  });

  it('disables view toggle and workflow actions while editing cabinet', () => {
    component.totalCabinetCount = 2;
    component.isEditingCabinet = true;

    fixture.detectChanges();

    const toggleButtons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.view-toggle-btn');
    expect(toggleButtons[0].disabled).toBeTrue();
    expect(toggleButtons[1].disabled).toBeTrue();

    const saveButton: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-success');
    const calculateButton: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-secondary');
    expect(saveButton.disabled).toBeTrue();
    expect(calculateButton.disabled).toBeTrue();
  });
});
