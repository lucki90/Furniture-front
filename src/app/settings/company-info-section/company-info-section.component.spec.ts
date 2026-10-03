import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { SettingsService } from '../settings.service';
import { CompanyInfo, CompanyInfoSectionComponent } from './company-info-section.component';

describe('CompanyInfoSectionComponent', () => {
  let fixture: ComponentFixture<CompanyInfoSectionComponent>;
  let component: CompanyInfoSectionComponent;
  let settingsService: jasmine.SpyObj<SettingsService>;

  beforeEach(async () => {
    settingsService = jasmine.createSpyObj<SettingsService>('SettingsService', [
      'deleteLogo',
      'getLogo',
      'uploadLogo',
    ]);

    await TestBed.configureTestingModule({
      imports: [CompanyInfoSectionComponent],
      providers: [{ provide: SettingsService, useValue: settingsService }],
    }).compileComponents();

    fixture = TestBed.createComponent(CompanyInfoSectionComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('powinien pobrać logo przez SettingsService zamiast ręcznego fetch', () => {
    const logoBlob = new Blob(['logo'], { type: 'image/png' });
    settingsService.getLogo.and.returnValue(of(logoBlob));
    const createObjectUrlSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:company-logo');

    component.loadLogo();

    expect(settingsService.getLogo).toHaveBeenCalledOnceWith();
    expect(createObjectUrlSpy).toHaveBeenCalledOnceWith(logoBlob);
    expect(component.companyLogoUrl).toBe('blob:company-logo');
  });

  it('powinien wyczyścić aktualne logo, gdy pobieranie się nie powiedzie', () => {
    component.companyLogoUrl = 'blob:previous-logo';
    settingsService.getLogo.and.returnValue(throwError(() => new Error('unauthorized')));
    const revokeObjectUrlSpy = spyOn(URL, 'revokeObjectURL');

    component.loadLogo();

    expect(settingsService.getLogo).toHaveBeenCalledOnceWith();
    expect(revokeObjectUrlSpy).toHaveBeenCalledOnceWith('blob:previous-logo');
    expect(component.companyLogoUrl).toBeNull();
  });

  it('powinien wczytać logo przy utworzeniu sekcji i zwolnić własny URL blob przy jej zniszczeniu', () => {
    const logoBlob = new Blob(['logo'], { type: 'image/png' });
    settingsService.getLogo.and.returnValue(of(logoBlob));
    spyOn(URL, 'createObjectURL').and.returnValue('blob:company-logo');
    const revokeObjectUrlSpy = spyOn(URL, 'revokeObjectURL');

    fixture.detectChanges();

    expect(settingsService.getLogo).toHaveBeenCalledOnceWith();
    expect(component.companyLogoUrl).toBe('blob:company-logo');

    fixture.destroy();

    expect(revokeObjectUrlSpy).toHaveBeenCalledOnceWith('blob:company-logo');
    expect(component.companyLogoUrl).toBeNull();
  });

  it('nie powinien tworzyć URL blob dla logo, które przyszło po zniszczeniu sekcji', () => {
    const logo$ = new Subject<Blob>();
    settingsService.getLogo.and.returnValue(logo$);
    const createObjectUrlSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:late-logo');

    fixture.detectChanges();
    fixture.destroy();
    logo$.next(new Blob(['logo'], { type: 'image/png' }));

    expect(createObjectUrlSpy).not.toHaveBeenCalled();
    expect(component.companyLogoUrl).toBeNull();
  });

  it('powinien pokazać model z wejścia i emitować nowy model po edycji bez mutowania wejścia', async () => {
    settingsService.getLogo.and.returnValue(of(new Blob()));
    spyOn(URL, 'createObjectURL').and.returnValue('blob:company-logo');
    const value: CompanyInfo = {
      companyName: 'Pracownia Test',
      companyAddress: 'Testowa 1',
      companyPhone: '123456789',
      companyEmail: 'firma@example.com',
      offerValidityDays: 30
    };
    const emitted: CompanyInfo[] = [];
    component.valueChange.subscribe(next => emitted.push(next));
    fixture.componentRef.setInput('value', value);

    fixture.detectChanges();
    await fixture.whenStable();
    const inputs: HTMLInputElement[] = Array.from(fixture.nativeElement.querySelectorAll('.form-grid input'));
    expect(inputs.map(input => input.value)).toEqual(['Pracownia Test', 'Testowa 1', '123456789', 'firma@example.com', '30']);

    inputs[0].value = 'Pracownia Nowa';
    inputs[0].dispatchEvent(new Event('input'));
    inputs[4].value = '45';
    inputs[4].dispatchEvent(new Event('input'));

    expect(emitted).toEqual([
      { ...value, companyName: 'Pracownia Nowa' },
      { ...value, companyName: 'Pracownia Nowa', offerValidityDays: 45 }
    ]);
    expect(value.companyName).toBe('Pracownia Test');
  });
});
