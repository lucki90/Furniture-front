import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormBuilder } from '@angular/forms';
import { CabinetSegmentsSectionComponent } from './cabinet-segments-section.component';
import { signal } from '@angular/core';
import { SegmentType } from '../../model/segment.model';
import { createSegmentFormGroup } from '../../model/segment-form-group';
import { DictionaryService } from '../../../service/dictionary.service';

describe('CabinetSegmentsSectionComponent', () => {
  let component: CabinetSegmentsSectionComponent;
  let fixture: ComponentFixture<CabinetSegmentsSectionComponent>;
  const fb = new FormBuilder();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CabinetSegmentsSectionComponent],
      providers: [{ provide: DictionaryService, useValue: { data: signal({ liftMechanismTypes: [] }) } }]
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

    expect(fixture.nativeElement.textContent).toContain('Sekcja lodówki: 1400mm');
  });

  it('słupek: popup segmentu pokazuje światło wnęki i uwagę do piekarnika (T3)', () => {
    component.form = fb.group({ width: [600], height: [2100] });
    component.segmentsArray = new FormArray([
      createSegmentFormGroup(fb, { segmentType: SegmentType.DOOR, height: 800, orderIndex: 0 }),
      createSegmentFormGroup(fb, { segmentType: SegmentType.OVEN, height: 600, orderIndex: 1 }),
      createSegmentFormGroup(fb, { segmentType: SegmentType.DRAWER, height: 700, orderIndex: 2 })
    ]);
    component.selectedSegmentIndex = 1;
    component.selectedSegmentForm = component.segmentsArray.at(1) as any;

    fixture.detectChanges();

    const popup: HTMLElement = fixture.nativeElement.querySelector('.segment-popup');
    expect(popup.textContent).toContain('Światło wnęki: 582 mm');
    expect(popup.querySelector('.segment-issues')?.textContent).toContain('o 18 mm');
  });

  it('lodówka w zabudowie: sekcje bez światła słupka', () => {
    component.isFridgeCabinet = true;
    component.selectedSegmentIndex = 0;

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.segment-opening')).toBeNull();
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
