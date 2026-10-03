import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HoodFormComponent } from './hood-form.component';
import { DictionaryService } from '../../../service/dictionary.service';
import { UpperHoodCabinetValidator } from '../../types/upper-hood/upper-hood-cabinet-validator';

describe('HoodFormComponent persisted screen', () => {
  let fixture: ComponentFixture<HoodFormComponent>;
  let form: FormGroup;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports:[HoodFormComponent], providers:[
      {provide:DictionaryService,useValue:{data:signal({hoodFrontTypes:[]})}}
    ] }).compileComponents();
    form = new FormBuilder().group({kitchenCabinetType:'UPPER_HOOD',width:600,height:500,depth:350,
      hoodFrontType:'FLAP',hoodScreenEnabled:true,hoodScreenHeightMm:100});
    new UpperHoodCabinetValidator().validate(form);
    fixture = TestBed.createComponent(HoodFormComponent);
    fixture.componentInstance.form = form;
  });
  it('shows and enables an enabled screen restored without events', () => {
    form.get('hoodScreenHeightMm')?.disable({emitEvent:false});
    fixture.detectChanges();
    expect(fixture.componentInstance.showHoodScreenHeight).toBeTrue();
    expect(form.get('hoodScreenHeightMm')?.enabled).toBeTrue();
    form.get('hoodScreenHeightMm')?.setValue(10);
    expect(form.invalid).toBeTrue();
    form.get('hoodScreenEnabled')?.setValue(false);
    fixture.detectChanges();
    expect(form.valid).toBeTrue();
    expect(form.getRawValue().hoodScreenHeightMm).toBe(10);
  });
  it('hides and disables a disabled screen even if its control was enabled', () => {
    form.patchValue({hoodScreenEnabled:false,hoodScreenHeightMm:10},{emitEvent:false});
    fixture.detectChanges();
    expect(fixture.componentInstance.showHoodScreenHeight).toBeFalse();
    expect(form.get('hoodScreenHeightMm')?.disabled).toBeTrue();
    expect(form.valid).toBeTrue();
  });
});
