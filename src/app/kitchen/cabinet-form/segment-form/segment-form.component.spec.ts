import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SegmentFormComponent } from './segment-form.component';
import { createSegmentFormGroup } from '../model/segment-form-group';
import { SegmentFrontType, SegmentType } from '../model/segment.model';
import { DictionaryService } from '../../service/dictionary.service';

describe('SegmentFormComponent — segment słupka', () => {
  const fb = new FormBuilder();
  let fixture: ComponentFixture<SegmentFormComponent>;
  let component: SegmentFormComponent;
  let segment: FormGroup;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SegmentFormComponent],
      providers: [{
        provide: DictionaryService,
        useValue: {
          data: signal({
            liftMechanismTypes: [
              { code: 'GAS_GTV', label: 'Podnośnik gazowy (GTV)' },
              { code: 'AVENTOS_HK_TOP', label: 'Aventos HK top' },
              { code: 'AVENTOS_HF_TOP', label: 'Aventos HF top (front składany)' }
            ]
          })
        }
      }]
    }).compileComponents();
  });

  function create(index: number, data: Parameters<typeof createSegmentFormGroup>[1] = { orderIndex: index }) {
    segment = createSegmentFormGroup(fb, data);
    fixture = TestBed.createComponent(SegmentFormComponent);
    component = fixture.componentInstance;
    component.segmentForm = segment;
    component.segmentIndex = index;
    component.cabinetWidthMm = 600;
    fixture.detectChanges();
  }

  const optionValues = (selector: string): string[] =>
    Array.from<HTMLOptionElement>(fixture.nativeElement.querySelectorAll(`select[formControlName="${selector}"] option`))
      .map(option => option.value);

  it('pokazuje światło wnęki i wymagania sprzętu', () => {
    create(1, { segmentType: SegmentType.DISHWASHER, height: 878, orderIndex: 1, dishwasherType: 'W60' });
    component.openingHeightMm = 860;
    fixture.detectChanges();

    const text = fixture.nativeElement.querySelector('.segment-opening').textContent;
    expect(text).toContain('Światło wnęki: 860 mm');
    expect(text).toContain('815–875 mm');
  });

  it('wyświetla uwagi segmentu', () => {
    create(0);
    component.segmentIssues = [{ segmentIndex: 0, code: 'ex.segment.door.too.wide', message: 'Za szerokie drzwi' }];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.segment-issues').textContent).toContain('Za szerokie drzwi');
  });

  it('klapa do góry tylko w najwyższym segmencie', () => {
    create(0);
    expect(optionValues('frontType')).toContain(SegmentFrontType.UPWARDS);

    create(1);
    expect(optionValues('frontType')).not.toContain(SegmentFrontType.UPWARDS);
  });

  it('klapa w dół: dostępna w każdym segmencie, bez wyboru podnośnika, z podpowiedzią o okuciach', () => {
    create(1);
    expect(optionValues('frontType')).toContain(SegmentFrontType.DOWNWARDS);

    segment.get('frontType')!.setValue(SegmentFrontType.DOWNWARDS);
    fixture.detectChanges();

    expect(segment.get('liftMechanismType')!.value).toBeNull();
    expect(fixture.nativeElement.querySelector('select[formControlName="liftMechanismType"]')).toBeNull();
    const hint = fixture.nativeElement.querySelector('.segment-hint').textContent;
    expect(hint).toContain('siłowniki odwrócone');
    expect(hint).toContain('nie jest półką');
  });

  it('klapa: domyślny podnośnik GTV, bez frontu składanego; drzwi czyszczą podnośnik', () => {
    create(0);

    segment.get('frontType')!.setValue(SegmentFrontType.UPWARDS);
    fixture.detectChanges();

    expect(segment.get('liftMechanismType')!.value).toBe('GAS_GTV');
    expect(optionValues('liftMechanismType')).toEqual(['GAS_GTV', 'AVENTOS_HK_TOP']);

    segment.get('frontType')!.setValue(SegmentFrontType.TWO_DOORS);
    expect(segment.get('liftMechanismType')!.value).toBeNull();
  });

  it('zmiana typu zeruje pola innych typów i ustawia domyślne nowego', () => {
    create(0);
    segment.get('frontType')!.setValue(SegmentFrontType.UPWARDS);

    segment.get('segmentType')!.setValue(SegmentType.MICROWAVE);

    expect(segment.getRawValue()).toEqual(jasmine.objectContaining({
      frontType: 'OPEN', microwaveType: 'M38', liftMechanismType: null, ovenHeightType: null, shelfQuantity: 0
    }));

    segment.get('segmentType')!.setValue(SegmentType.DRAWER);
    segment.get('segmentType')!.setValue(SegmentType.DOOR);

    expect(segment.getRawValue()).toEqual(jasmine.objectContaining({
      frontType: SegmentFrontType.ONE_DOOR, microwaveType: null, drawerQuantity: null
    }));
  });

  it('zmywarka: domyślna szerokość z światła słupka', () => {
    create(1);
    component.cabinetWidthMm = 636;
    segment.get('segmentType')!.setValue(SegmentType.DISHWASHER);
    expect(segment.get('dishwasherType')!.value).toBe('W60');
    expect(segment.get('frontType')!.value).toBe(SegmentFrontType.ONE_DOOR);

    create(1);
    component.cabinetWidthMm = 486;
    segment.get('segmentType')!.setValue(SegmentType.DISHWASHER);
    expect(segment.get('dishwasherType')!.value).toBe('W45');
  });
});
