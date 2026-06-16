import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SettingsService } from '../settings.service';
import { CompanyInfoSectionComponent } from './company-info-section.component';

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
});
