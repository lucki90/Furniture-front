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
    expect(text).toContain('Projekt #42');
    expect(text).toContain('wersja 3');
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
});
