import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KitchenPageHeaderComponent } from './kitchen-page-header.component';

describe('KitchenPageHeaderComponent', () => {
  let component: KitchenPageHeaderComponent;
  let fixture: ComponentFixture<KitchenPageHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitchenPageHeaderComponent]
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
    component.projectId = 42;
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

    const workflowButtons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.workflow-action-btn');
    const clearButton = workflowButtons[0];
    const calculateButton = workflowButtons[1];
    const saveButton = workflowButtons[2];
    expect(clearButton.disabled).toBeTrue();
    expect(saveButton.disabled).toBeTrue();
    expect(calculateButton.disabled).toBeTrue();
  });

  it('emits clear action from workflow group', () => {
    spyOn(component.clearAll, 'emit');
    component.totalCabinetCount = 2;

    fixture.detectChanges();

    const clearButton: HTMLButtonElement = fixture.nativeElement.querySelector('.workflow-action-btn--clear');
    clearButton.click();

    expect(component.clearAll.emit).toHaveBeenCalled();
  });

  it('emits projects drawer toggle from header button', () => {
    spyOn(component.toggleProjectsDrawer, 'emit');

    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.projects-toggle-btn');
    button.click();

    expect(component.toggleProjectsDrawer.emit).toHaveBeenCalled();
  });
});
