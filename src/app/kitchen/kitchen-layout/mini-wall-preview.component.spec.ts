import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MiniWallPreviewComponent } from './mini-wall-preview.component';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';

describe('MiniWallPreviewComponent', () => {
  let fixture: ComponentFixture<MiniWallPreviewComponent>;
  let component: MiniWallPreviewComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiniWallPreviewComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MiniWallPreviewComponent);
    component = fixture.componentInstance;
  });

  function withBottomCabinet(): void {
    component.cabinets = [
      {
        id: 'base-1',
        type: KitchenCabinetType.BASE_ONE_DOOR,
        width: 600,
        height: 720,
        depth: 560,
        openingType: 'LEFT',
        shelfQuantity: 1,
        positionY: 0
      } as any
    ];
    component.wallWidthMm = 1800;
    component.wallHeightMm = 2600;
  }

  it('should not render countertop strips in wall cards preview', () => {
    withBottomCabinet();

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.mini-wall-countertop')).toBeNull();
    expect(fixture.nativeElement.querySelector('.mini-wall-floor')).not.toBeNull();
  });

  // Bug-fix 2026-06-08: checkbox „Cokół" steruje tylko panelem cokołu — nóżki zostają.
  it('hides the plinth panel but keeps the feet when plinth is disabled', () => {
    withBottomCabinet();
    component.plinthEnabled = false;

    component.ngOnChanges();
    fixture.detectChanges();

    // Panel cokołu znika...
    expect(fixture.nativeElement.querySelector('.mini-wall-plinth')).toBeNull();
    // ...ale nóżki zostają (feetHeight > 0 dla szafki dolnej).
    const bottom = (component as any).visualPositions.find((p: any) => p.zone === 'BOTTOM');
    expect(bottom).toBeDefined();
    expect(bottom.feetHeight).toBeGreaterThan(0);
  });

  it('renders the plinth panel when plinth is enabled', () => {
    withBottomCabinet();
    component.plinthEnabled = true;

    component.ngOnChanges();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.mini-wall-plinth')).not.toBeNull();
  });
});
