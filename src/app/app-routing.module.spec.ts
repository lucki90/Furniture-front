import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {AppRoutingModule} from './app-routing.module';
import {AuthService} from './core/auth/auth.service';
import {ErrorTranslationService} from './core/error/error-translation.service';
import {LoginComponent} from './login/login.component';
import {NotFoundComponent} from './not-found/not-found.component';

describe('AppRoutingModule', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppRoutingModule],
      providers: [
        {
          provide: AuthService,
          useValue: {
            isLoggedIn: signal(false),
            isAdmin: signal(false),
            initFromStorage: jasmine.createSpy('initFromStorage'),
            login: jasmine.createSpy('login')
          }
        },
        {provide: ErrorTranslationService, useValue: {}}
      ]
    });
  });

  it('kieruje nieznany URL do strony 404', async () => {
    const harness = await RouterTestingHarness.create('/nieistniejacy-adres');

    expect(harness.routeDebugElement?.componentInstance).toEqual(jasmine.any(NotFoundComponent));
  });

  it('pozostawia wildcard na końcu i nie przechwytuje istniejącej trasy', async () => {
    const router = TestBed.inject(Router);
    const harness = await RouterTestingHarness.create();

    expect(router.config[router.config.length - 1]?.path).toBe('**');
    await harness.navigateByUrl('/login', LoginComponent);
    expect(harness.routeDebugElement?.componentInstance).toEqual(jasmine.any(LoginComponent));
  });

  it('ładuje duże ekrany aplikacji jako osobne chunki tras', () => {
    const router = TestBed.inject(Router);

    for (const path of ['kitchen', 'kitchen/projects', 'settings']) {
      const route = router.config.find(candidate => candidate.path === path);
      expect(route?.loadComponent).withContext(path).toEqual(jasmine.any(Function));
      expect(route?.component).withContext(path).toBeUndefined();
    }
  });
});
