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

  it('should not render countertop strips in wall cards preview', () => {
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

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.mini-wall-countertop')).toBeNull();
    expect(fixture.nativeElement.querySelector('.mini-wall-floor')).not.toBeNull();
  });
});
