import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KitchenLayoutInfoPanelComponent } from './kitchen-layout-info-panel.component';

describe('KitchenLayoutInfoPanelComponent', () => {
  let fixture: ComponentFixture<KitchenLayoutInfoPanelComponent>;
  let component: KitchenLayoutInfoPanelComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitchenLayoutInfoPanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(KitchenLayoutInfoPanelComponent);
    component = fixture.componentInstance;
  });

  it('renders warnings when constraints are violated', () => {
    component.isWorkspaceGapViolation = true;
    component.gapMm = 380;
    component.fitsOnWall = false;
    component.wallLength = 3200;
    component.cooktopGapWarning = {
      message: 'Zachowaj minimum 750 mm nad płytą gazową',
      minMm: 750,
      actualMm: 620
    };
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('.warning-item').length).toBe(3);
    expect(root.textContent).toContain('380 mm');
    expect(root.textContent).toContain('3200 mm');
    expect(root.textContent).toContain('750 mm');
  });

  it('hides warning panel when there are no issues', () => {
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.warnings-panel')).toBeNull();
    expect(root.querySelector('.legend')).not.toBeNull();
  });

  it('always renders legend items', () => {
    fixture.detectChanges();

    const legendItems = Array.from(
      fixture.nativeElement.querySelectorAll('.legend-item')
    ) as HTMLElement[];
    const labels = legendItems.map(item => item.textContent?.trim());
    expect(labels).toContain('Dolna');
    expect(labels).toContain('Blat');
    expect(labels).toContain('h/d = różnica wys./głęb.');
  });
});
