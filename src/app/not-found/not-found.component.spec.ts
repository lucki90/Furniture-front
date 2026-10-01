import {signal, WritableSignal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {provideRouter} from '@angular/router';
import {AuthService} from '../core/auth/auth.service';
import {NotFoundComponent} from './not-found.component';

describe('NotFoundComponent', () => {
  let fixture: ComponentFixture<NotFoundComponent>;
  let isLoggedIn: WritableSignal<boolean>;

  beforeEach(async () => {
    isLoggedIn = signal(false);

    await TestBed.configureTestingModule({
      imports: [NotFoundComponent],
      providers: [
        provideRouter([]),
        {provide: AuthService, useValue: {isLoggedIn}}
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NotFoundComponent);
    fixture.detectChanges();
  });

  it('pokazuje komunikat 404 i link do logowania niezalogowanemu użytkownikowi', () => {
    const content = fixture.nativeElement.textContent as string;
    const action = fixture.debugElement.query(By.css('.not-found__action')).nativeElement as HTMLAnchorElement;

    expect(content).toContain('404');
    expect(content).toContain('Nie znaleziono strony');
    expect(content).toContain('adres jest nieprawidłowy albo strona została przeniesiona');
    expect(action.textContent?.trim()).toBe('Przejdź do logowania');
    expect(action.getAttribute('href')).toBe('/login');
  });

  it('pokazuje zalogowanemu użytkownikowi link do listy projektów', () => {
    isLoggedIn.set(true);
    fixture.detectChanges();

    const action = fixture.debugElement.query(By.css('.not-found__action')).nativeElement as HTMLAnchorElement;

    expect(action.textContent?.trim()).toBe('Przejdź do projektów');
    expect(action.getAttribute('href')).toBe('/kitchen/projects');
  });
});
