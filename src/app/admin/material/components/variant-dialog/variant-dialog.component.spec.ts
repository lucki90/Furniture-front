import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, of, throwError, Subject } from 'rxjs';
import { MaterialAdminService } from '../../service/material-admin.service';
import { ApiErrorHandler } from '../../../../core/error/api-error-handler.service';
import { TranslationService } from '../../../../translation/translation.service';
import { VariantDialogComponent, VariantDialogData } from './variant-dialog.component';

describe('VariantDialogComponent — podgląd tłumaczenia (FE-14)', () => {
  let fixture: ComponentFixture<VariantDialogComponent>;
  let component: VariantDialogComponent;
  let materialAdminService: jasmine.SpyObj<MaterialAdminService>;
  let translationService: jasmine.SpyObj<TranslationService>;

  function setup(): void {
    materialAdminService = jasmine.createSpyObj<MaterialAdminService>('MaterialAdminService', ['getComponentOptions']);
    materialAdminService.getComponentOptions.and.returnValue(of([]));

    translationService = jasmine.createSpyObj<TranslationService>('TranslationService', ['getByCategory']);

    const data: VariantDialogData = { type: 'component', mode: 'create' };

    TestBed.configureTestingModule({
      imports: [VariantDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MaterialAdminService, useValue: materialAdminService },
        { provide: TranslationService, useValue: translationService },
        { provide: ApiErrorHandler, useValue: jasmine.createSpyObj<ApiErrorHandler>('ApiErrorHandler', ['handle']) },
        { provide: MatDialogRef, useValue: jasmine.createSpyObj<MatDialogRef<VariantDialogComponent>>('MatDialogRef', ['close']) },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ]
    });

    fixture = TestBed.createComponent(VariantDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function waitForDebounce(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 550));
  }

  it('resetuje stan i przeżywa błąd backendu, a kolejny klucz nadal odświeża podgląd', async () => {
    setup();

    // 1) Błąd backendu dla pierwszego klucza — catchError WEWNĄTRZ switchMap kończy tylko bieżące zapytanie.
    translationService.getByCategory.and.returnValue(throwError(() => new Error('boom')));
    component.translationLoading.set(true);
    component.form.get('translationKey')?.setValue('HINGE.SOFT');
    await waitForDebounce();

    expect(component.translationLoading()).toBeFalse();
    expect(component.translationPl()).toBe('');
    expect(component.translationEn()).toBe('');
    expect(component.translationKeyExists()).toBeNull();

    // 2) Strumień valueChanges musi żyć dalej — kolejny (poprawny) klucz odświeża podgląd.
    translationService.getByCategory.and.callFake((_category: string, lang = 'pl'): Observable<{ [k: string]: string }> =>
      of(lang === 'en' ? { 'HINGE.QUIET': 'Quiet hinge' } : { 'HINGE.QUIET': 'Zawias cichy' })
    );
    component.form.get('translationKey')?.setValue('HINGE.QUIET');
    await waitForDebounce();

    expect(component.translationPl()).toBe('Zawias cichy');
    expect(component.translationEn()).toBe('Quiet hinge');
    expect(component.translationKeyExists()).toBeTrue();
    expect(component.translationLoading()).toBeFalse();
  });

  it('resetuje spinner gdy skrócony klucz anuluje trwające zapytanie', async () => {
    setup();

    // 1) Poprawny klucz uruchamia zapytanie, które jeszcze nie odpowiedziało (pending) — loading=true.
    const pending = new Subject<{ [k: string]: string }>();
    translationService.getByCategory.and.returnValue(pending.asObservable());
    component.form.get('translationKey')?.setValue('HINGE.QUIET');
    await waitForDebounce();

    expect(component.translationLoading()).toBeTrue();

    // 2) Skrócenie klucza poniżej progu: switchMap anuluje pending forkJoin i wchodzi w gałąź EMPTY.
    component.form.get('translationKey')?.setValue('HI');
    await waitForDebounce();

    expect(component.translationLoading()).toBeFalse();
    expect(component.translationPl()).toBe('');
    expect(component.translationEn()).toBe('');
    expect(component.translationKeyExists()).toBeNull();

    pending.complete();
  });
});
