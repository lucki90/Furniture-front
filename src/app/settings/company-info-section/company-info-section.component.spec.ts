import { HttpErrorResponse } from '@angular/common/http';
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

  describe('kolejność odczytu logo względem uploadu i usunięcia', () => {
    const OLD_LOGO_URL = 'blob:old-logo';
    const NEW_LOGO_URL = 'blob:new-logo';
    let logoReads: Subject<Blob>[];
    let upload$: Subject<void>;
    let delete$: Subject<void>;
    let newLogo: File;
    let createObjectUrlSpy: jasmine.Spy;
    let revokeObjectUrlSpy: jasmine.Spy;

    const oldLogoBytes = (): Blob => new Blob(['old-logo'], { type: 'image/png' });
    const logoImg = (): HTMLImageElement | null => fixture.nativeElement.querySelector('img.logo-img');
    const dropzone = (): HTMLElement | null => fixture.nativeElement.querySelector('.logo-dropzone');
    const logoError = (): string | undefined => fixture.nativeElement.querySelector('.logo-error')?.textContent?.trim();

    beforeEach(() => {
      logoReads = [];
      settingsService.getLogo.and.callFake(() => {
        const read$ = new Subject<Blob>();
        logoReads.push(read$);
        return read$;
      });
      upload$ = new Subject<void>();
      settingsService.uploadLogo.and.returnValue(upload$);
      delete$ = new Subject<void>();
      settingsService.deleteLogo.and.returnValue(delete$);
      newLogo = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'nowe-logo.png', { type: 'image/png' });
      createObjectUrlSpy = spyOn(URL, 'createObjectURL').and.callFake(
        (obj: Blob | MediaSource) => obj === newLogo ? NEW_LOGO_URL : OLD_LOGO_URL
      );
      revokeObjectUrlSpy = spyOn(URL, 'revokeObjectURL');
    });

    function respondLogoRead(read$: Subject<Blob>, blob: Blob): void {
      read$.next(blob);
      read$.complete();
      fixture.detectChanges();
    }

    function failLogoRead(read$: Subject<Blob>, status: number): void {
      read$.error(new HttpErrorResponse({ status }));
      fixture.detectChanges();
    }

    function selectLogoFile(file: File): void {
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    }

    function clickRemoveLogo(): void {
      fixture.nativeElement.querySelector('.logo-filled-actions button').click();
      fixture.detectChanges();
    }

    function confirmWrite(write$: Subject<void>): void {
      write$.next();
      write$.complete();
      fixture.detectChanges();
    }

    function failWrite(write$: Subject<void>): void {
      write$.error(new HttpErrorResponse({ status: 500 }));
      fixture.detectChanges();
    }

    function expectLogoShown(url: string): void {
      expect(component.companyLogoUrl).toBe(url);
      expect(logoImg()?.getAttribute('src')).toBe(url);
      expect(dropzone()).toBeNull();
    }

    function expectNoLogo(): void {
      expect(component.companyLogoUrl).toBeNull();
      expect(logoImg()).toBeNull();
      expect(dropzone()?.textContent).toContain('Nie ustawiono logo');
    }

    it('nie powinien przywrócić starego logo, gdy GET rozpoczęty przed uploadem odpowie po jego potwierdzeniu', () => {
      fixture.detectChanges();
      expect(logoReads.length).toBe(1);

      selectLogoFile(newLogo);
      expect(settingsService.uploadLogo).toHaveBeenCalledOnceWith(newLogo);
      confirmWrite(upload$);
      expectLogoShown(NEW_LOGO_URL);

      respondLogoRead(logoReads[0], oldLogoBytes());

      expectLogoShown(NEW_LOGO_URL);
      expect(component.logoUploading).toBeFalse();
      expect(logoError()).toBeUndefined();
      expect(createObjectUrlSpy.calls.allArgs()).toEqual([[newLogo]]);
      expect(revokeObjectUrlSpy).not.toHaveBeenCalled();

      fixture.destroy();
      expect(revokeObjectUrlSpy.calls.allArgs()).toEqual([[NEW_LOGO_URL]]);
    });

    it('nie powinien ukryć potwierdzonego logo, gdy GET rozpoczęty przed uploadem zakończy się błędem po jego potwierdzeniu', () => {
      fixture.detectChanges();
      selectLogoFile(newLogo);
      confirmWrite(upload$);
      expectLogoShown(NEW_LOGO_URL);

      failLogoRead(logoReads[0], 503);

      expectLogoShown(NEW_LOGO_URL);
      expect(logoError()).toBeUndefined();
      expect(revokeObjectUrlSpy).not.toHaveBeenCalled();
    });

    it('nie powinien przywrócić usuniętego logo, gdy starszy odczyt odpowie po potwierdzonym usunięciu', () => {
      fixture.detectChanges();
      respondLogoRead(logoReads[0], oldLogoBytes());
      expectLogoShown(OLD_LOGO_URL);

      component.loadLogo();
      expect(logoReads.length).toBe(2);
      clickRemoveLogo();
      expect(settingsService.deleteLogo).toHaveBeenCalledOnceWith();
      confirmWrite(delete$);
      expectNoLogo();

      respondLogoRead(logoReads[1], oldLogoBytes());

      expectNoLogo();
      expect(logoError()).toBeUndefined();
      expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectUrlSpy.calls.allArgs()).toEqual([[OLD_LOGO_URL]]);
    });

    it('powinien pokazać logo z opóźnionego GET, gdy w międzyczasie nic nie zmieniono', () => {
      fixture.detectChanges();
      expectNoLogo();

      const logo = oldLogoBytes();
      respondLogoRead(logoReads[0], logo);

      expectLogoShown(OLD_LOGO_URL);
      expect(createObjectUrlSpy.calls.allArgs()).toEqual([[logo]]);
    });

    it('powinien zachować stan braku logo, gdy zwykły GET zwróci 404 lub inny błąd', () => {
      fixture.detectChanges();
      failLogoRead(logoReads[0], 404);
      expectNoLogo();

      component.loadLogo();
      failLogoRead(logoReads[1], 503);

      expectNoLogo();
      expect(logoError()).toBeUndefined();
      expect(createObjectUrlSpy).not.toHaveBeenCalled();
      expect(revokeObjectUrlSpy).not.toHaveBeenCalled();
    });

    it('powinien zastąpić logo po potwierdzonym uploadzie, gdy GET zakończył się wcześniej', () => {
      fixture.detectChanges();
      respondLogoRead(logoReads[0], oldLogoBytes());
      expectLogoShown(OLD_LOGO_URL);

      selectLogoFile(newLogo);
      expect(component.logoUploading).toBeTrue();
      confirmWrite(upload$);

      expectLogoShown(NEW_LOGO_URL);
      expect(component.logoUploading).toBeFalse();
      expect(logoError()).toBeUndefined();
      expect(revokeObjectUrlSpy.calls.allArgs()).toEqual([[OLD_LOGO_URL]]);
    });

    it('powinien zachować ostatnie potwierdzone logo i pokazać komunikat po błędzie uploadu', () => {
      spyOn(console, 'error');
      fixture.detectChanges();
      respondLogoRead(logoReads[0], oldLogoBytes());

      selectLogoFile(newLogo);
      failWrite(upload$);

      expectLogoShown(OLD_LOGO_URL);
      expect(component.logoUploading).toBeFalse();
      expect(logoError()).toBe('Nie udało się przesłać logo. Sprawdź format i rozmiar pliku.');
      expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectUrlSpy).not.toHaveBeenCalled();
    });

    it('powinien pokazać logo z GET, który odpowie dopiero po nieudanym uploadzie', () => {
      spyOn(console, 'error');
      fixture.detectChanges();
      selectLogoFile(newLogo);
      failWrite(upload$);
      expectNoLogo();

      respondLogoRead(logoReads[0], oldLogoBytes());

      expectLogoShown(OLD_LOGO_URL);
      expect(logoError()).toBe('Nie udało się przesłać logo. Sprawdź format i rozmiar pliku.');
    });

    it('powinien zachować logo po błędzie usunięcia i usunąć podgląd po potwierdzonym usunięciu', () => {
      spyOn(console, 'error');
      fixture.detectChanges();
      respondLogoRead(logoReads[0], oldLogoBytes());

      clickRemoveLogo();
      failWrite(delete$);

      expectLogoShown(OLD_LOGO_URL);
      expect(logoError()).toBe('Nie udało się usunąć logo.');
      expect(revokeObjectUrlSpy).not.toHaveBeenCalled();

      delete$ = new Subject<void>();
      settingsService.deleteLogo.and.returnValue(delete$);
      clickRemoveLogo();
      confirmWrite(delete$);

      expectNoLogo();
      expect(logoError()).toBeUndefined();
      expect(revokeObjectUrlSpy.calls.allArgs()).toEqual([[OLD_LOGO_URL]]);
    });

    it('powinien odrzucić plik w złym formacie lub większy niż 512000 B bez wysyłania', () => {
      fixture.detectChanges();

      selectLogoFile(new File(['gif'], 'logo.gif', { type: 'image/gif' }));
      expect(logoError()).toBe('Dozwolone formaty: PNG, JPEG.');

      selectLogoFile(new File([new Uint8Array(512_001)], 'za-duze.png', { type: 'image/png' }));
      expect(logoError()).toBe('Plik jest za duży. Maksymalny rozmiar: 500 KB.');
      expect(settingsService.uploadLogo).not.toHaveBeenCalled();

      const maxJpeg = new File([new Uint8Array(512_000)], 'max.jpg', { type: 'image/jpeg' });
      selectLogoFile(maxJpeg);
      expect(settingsService.uploadLogo).toHaveBeenCalledOnceWith(maxJpeg);
      expect(logoError()).toBeUndefined();
    });

    it('nie powinien tworzyć URL blob z uploadu ani GET, które odpowiedzą po zniszczeniu sekcji', () => {
      fixture.detectChanges();
      respondLogoRead(logoReads[0], oldLogoBytes());
      component.loadLogo();
      selectLogoFile(newLogo);

      fixture.destroy();
      expect(revokeObjectUrlSpy.calls.allArgs()).toEqual([[OLD_LOGO_URL]]);

      upload$.next();
      upload$.complete();
      logoReads[1].next(oldLogoBytes());
      logoReads[1].complete();

      expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectUrlSpy.calls.allArgs()).toEqual([[OLD_LOGO_URL]]);
      expect(component.companyLogoUrl).toBeNull();
    });

    it('powinien zwolnić zastąpiony i końcowy URL blob, a odrzucony stary GET nie zwalnia aktualnego logo', () => {
      fixture.detectChanges();
      const oldLogo = oldLogoBytes();
      respondLogoRead(logoReads[0], oldLogo);
      component.loadLogo();
      selectLogoFile(newLogo);
      confirmWrite(upload$);
      expect(revokeObjectUrlSpy.calls.allArgs()).toEqual([[OLD_LOGO_URL]]);

      respondLogoRead(logoReads[1], oldLogoBytes());

      expectLogoShown(NEW_LOGO_URL);
      expect(revokeObjectUrlSpy.calls.allArgs()).toEqual([[OLD_LOGO_URL]]);

      fixture.destroy();
      expect(createObjectUrlSpy.calls.allArgs()).toEqual([[oldLogo], [newLogo]]);
      expect(revokeObjectUrlSpy.calls.allArgs()).toEqual([[OLD_LOGO_URL], [NEW_LOGO_URL]]);
    });

    describe('jedna operacja zapisu logo naraz w bieżącej sekcji', () => {
      const fileInput = (): HTMLInputElement => fixture.nativeElement.querySelector('input[type="file"]');
      const fileLabel = (): HTMLElement => fileInput().closest('label') as HTMLElement;
      const removeButton = (): HTMLButtonElement => fixture.nativeElement.querySelector('.logo-filled-actions button');

      function showOldLogo(): void {
        fixture.detectChanges();
        respondLogoRead(logoReads[0], oldLogoBytes());
        expectLogoShown(OLD_LOGO_URL);
      }

      /** Zdarzenie change spoza szablonu — sprawdza guard metody niezależnie od atrybutu disabled. */
      function changeEventFor(file: File): Event {
        const input = document.createElement('input');
        input.type = 'file';
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        return { target: input } as unknown as Event;
      }

      it('powinien wysłać dokładnie jedno DELETE, gdy Usuń kliknięto ponownie w trakcie usuwania', () => {
        showOldLogo();

        clickRemoveLogo();
        clickRemoveLogo();

        expect(settingsService.deleteLogo).toHaveBeenCalledTimes(1);
        expect(removeButton().disabled).toBeTrue();
        expectLogoShown(OLD_LOGO_URL);
      });

      it('nie powinien rozpocząć uploadu, gdy w trakcie usuwania wybrano nowy plik', () => {
        showOldLogo();
        clickRemoveLogo();

        expect(fileInput().disabled).toBeTrue();
        selectLogoFile(newLogo);

        expect(settingsService.uploadLogo).not.toHaveBeenCalled();
        expect(settingsService.deleteLogo).toHaveBeenCalledTimes(1);
        expectLogoShown(OLD_LOGO_URL);
      });

      it('powinien zablokować ponowne usunięcie i upload wywołane bez DOM, dopóki DELETE trwa', () => {
        showOldLogo();
        clickRemoveLogo();

        component.removeLogo();
        component.onLogoSelected(changeEventFor(newLogo));

        expect(settingsService.deleteLogo).toHaveBeenCalledTimes(1);
        expect(settingsService.uploadLogo).not.toHaveBeenCalled();
        expectLogoShown(OLD_LOGO_URL);
      });

      it('powinien trzymać blokadę do potwierdzenia DELETE, potem usunąć podgląd, zwolnić URL i pozwolić na nowy upload', () => {
        showOldLogo();

        clickRemoveLogo();
        expect(removeButton().disabled).toBeTrue();
        expect(removeButton().textContent?.trim()).toBe('Usuwanie…');
        expect(fileInput().disabled).toBeTrue();
        expect(fileLabel().classList).toContain('disabled');
        expect(revokeObjectUrlSpy).not.toHaveBeenCalled();

        confirmWrite(delete$);

        expectNoLogo();
        expect(logoError()).toBeUndefined();
        expect(revokeObjectUrlSpy.calls.allArgs()).toEqual([[OLD_LOGO_URL]]);
        expect(fileInput().disabled).toBeFalse();
        expect(fileLabel().classList).not.toContain('disabled');

        selectLogoFile(newLogo);
        expect(settingsService.uploadLogo).toHaveBeenCalledOnceWith(newLogo);
        confirmWrite(upload$);

        expectLogoShown(NEW_LOGO_URL);
        expect(settingsService.deleteLogo).toHaveBeenCalledTimes(1);
        expect(createObjectUrlSpy).toHaveBeenCalledTimes(2);
      });

      it('po błędzie DELETE powinien zachować logo, pokazać komunikat i odblokować usuwanie oraz upload', () => {
        spyOn(console, 'error');
        showOldLogo();
        clickRemoveLogo();

        failWrite(delete$);

        expectLogoShown(OLD_LOGO_URL);
        expect(logoError()).toBe('Nie udało się usunąć logo.');
        expect(removeButton().disabled).toBeFalse();
        expect(removeButton().textContent?.trim()).toBe('Usuń');
        expect(fileInput().disabled).toBeFalse();
        expect(revokeObjectUrlSpy).not.toHaveBeenCalled();

        selectLogoFile(newLogo);
        expect(settingsService.uploadLogo).toHaveBeenCalledOnceWith(newLogo);
        confirmWrite(upload$);

        expectLogoShown(NEW_LOGO_URL);
        expect(logoError()).toBeUndefined();
        expect(settingsService.deleteLogo).toHaveBeenCalledTimes(1);
        expect(revokeObjectUrlSpy.calls.allArgs()).toEqual([[OLD_LOGO_URL]]);
      });

      it('powinien blokować wybór pliku w pustym stanie, gdy GET bez logo odpowie w trakcie DELETE', () => {
        showOldLogo();
        component.loadLogo();
        clickRemoveLogo();

        failLogoRead(logoReads[1], 404);

        expectNoLogo();
        expect(fileInput().disabled).toBeTrue();
        expect(fileLabel().classList).toContain('disabled');
        selectLogoFile(newLogo);
        expect(settingsService.uploadLogo).not.toHaveBeenCalled();

        confirmWrite(delete$);

        expectNoLogo();
        expect(fileInput().disabled).toBeFalse();
        expect(fileLabel().classList).not.toContain('disabled');
      });

      it('nie powinien przywrócić starego logo z GET rozpoczętego w trakcie DELETE, który odpowie po jego potwierdzeniu', () => {
        showOldLogo();
        clickRemoveLogo();
        component.loadLogo();
        expect(logoReads.length).toBe(2);

        confirmWrite(delete$);
        respondLogoRead(logoReads[1], oldLogoBytes());

        expectNoLogo();
        expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
        expect(revokeObjectUrlSpy.calls.allArgs()).toEqual([[OLD_LOGO_URL]]);
      });

      it('w trakcie uploadu powinien blokować usuwanie i kolejny upload, także wywołane bez DOM', () => {
        const otherLogo = new File([new Uint8Array([0xff, 0xd8])], 'inne-logo.jpg', { type: 'image/jpeg' });
        showOldLogo();

        selectLogoFile(newLogo);
        expect(removeButton().disabled).toBeTrue();
        expect(fileInput().disabled).toBeTrue();

        selectLogoFile(otherLogo);
        component.onLogoSelected(changeEventFor(otherLogo));
        component.removeLogo();
        clickRemoveLogo();

        expect(settingsService.uploadLogo).toHaveBeenCalledOnceWith(newLogo);
        expect(settingsService.deleteLogo).not.toHaveBeenCalled();

        confirmWrite(upload$);

        expectLogoShown(NEW_LOGO_URL);
        expect(component.logoUploading).toBeFalse();
        expect(removeButton().disabled).toBeFalse();
        expect(fileInput().disabled).toBeFalse();
      });

      it('nie powinien tworzyć URL ani zwalniać go ponownie, gdy DELETE odpowie po zniszczeniu sekcji', () => {
        showOldLogo();
        clickRemoveLogo();

        fixture.destroy();
        expect(revokeObjectUrlSpy.calls.allArgs()).toEqual([[OLD_LOGO_URL]]);

        delete$.next();
        delete$.complete();

        expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
        expect(revokeObjectUrlSpy.calls.allArgs()).toEqual([[OLD_LOGO_URL]]);
        expect(component.companyLogoUrl).toBeNull();
      });
    });
  });
});
