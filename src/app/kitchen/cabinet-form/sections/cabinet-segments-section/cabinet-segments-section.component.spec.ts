import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder } from '@angular/forms';
import { CabinetSegmentsSectionComponent } from './cabinet-segments-section.component';
import { SegmentType } from '../../model/segment.model';

describe('CabinetSegmentsSectionComponent', () => {
  let component: CabinetSegmentsSectionComponent;
  let fixture: ComponentFixture<CabinetSegmentsSectionComponent>;
  const fb = new FormBuilder();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CabinetSegmentsSectionComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CabinetSegmentsSectionComponent);
    component = fixture.componentInstance;
    component.form = fb.group({
      height: [2000]
    });
    component.segmentsArray = new FormArray([
      fb.group({
        height: [600],
        segmentType: [SegmentType.DOOR],
        orderIndex: [0],
        frontType: ['ONE_DOOR'],
        shelfQuantity: [1],
        drawerQuantity: [null],
        drawerModel: [null]
      })
    ]);
    component.selectedSegmentForm = component.segmentsArray.at(0) as any;
    component.activeSegmentTypeOptions = [{ value: SegmentType.DOOR, label: 'Door', icon: 'D' }];
  });

  it('renders fridge info when cabinet is a built-in fridge', () => {
    component.isFridgeCabinet = true;
    component.fridgeSectionHeight = 1400;
    component.fridgeUpperSectionsHeightSum = 600;

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sekcja lodowki: 1400mm');
  });

  it('emits add and close events', () => {
    spyOn(component.addSegment, 'emit');
    spyOn(component.closeSegmentPopup, 'emit');
    component.selectedSegmentIndex = 0;

    fixture.detectChanges();

    fixture.nativeElement.querySelector('.btn-add-segment').click();
    fixture.nativeElement.querySelector('.btn-close-popup').click();

    expect(component.addSegment.emit).toHaveBeenCalled();
    expect(component.closeSegmentPopup.emit).toHaveBeenCalled();
  });
});
