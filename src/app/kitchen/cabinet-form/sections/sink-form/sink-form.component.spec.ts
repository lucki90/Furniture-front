import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SinkFormComponent } from './sink-form.component';
import { DictionaryService } from '../../../service/dictionary.service';
import { CabinetFormValidationErrorsService } from '../../cabinet-form-validation-errors.service';
import { BaseSinkCabinetValidator } from '../../types/base-sink/base-sink-cabinet-validator';

describe('SinkFormComponent apron validation', () => {
  let fixture: ComponentFixture<SinkFormComponent>;
  let form: FormGroup;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SinkFormComponent],
      providers: [
        { provide: DictionaryService, useValue: { data: signal({ sinkFrontTypes: [], drawerModels: [] }) } },
        { provide: CabinetFormValidationErrorsService, useValue: { getControlError: () => null } }
      ]
    }).compileComponents();
    form = new FormBuilder().group({ kitchenCabinetType: 'BASE_SINK', width: 600, height: 720, depth: 500,
      sinkFrontType: 'TWO_DOORS', sinkApronEnabled: true, sinkApronHeightMm: 150, sinkDrawerModel: 'ANTARO_TANDEMBOX' });
    new BaseSinkCabinetValidator().validate(form);
    fixture = TestBed.createComponent(SinkFormComponent);
    fixture.componentInstance.form = form;
  });

  it('unblocks the form when an invalid apron is disabled and validates it again when enabled', () => {
    fixture.detectChanges();
    form.get('sinkApronHeightMm')?.setValue(10);
    expect(form.invalid).toBeTrue();
    form.get('sinkApronEnabled')?.setValue(false);
    fixture.detectChanges();
    expect(form.valid).toBeTrue();
    expect(form.getRawValue().sinkApronHeightMm).toBe(10);
    expect(fixture.nativeElement.querySelector('input[formControlName="sinkApronHeightMm"]')).toBeNull();
    form.get('sinkApronEnabled')?.setValue(true);
    fixture.detectChanges();
    expect(form.invalid).toBeTrue();
    form.get('sinkApronHeightMm')?.setValue(150);
    expect(form.valid).toBeTrue();
  });

  it('ignores an invalid persisted height when editing a cabinet with the apron disabled', () => {
    form.patchValue({ sinkApronEnabled: false, sinkApronHeightMm: 10 }, { emitEvent: false });
    fixture.detectChanges();
    expect(form.valid).toBeTrue();
  });
});
