import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { KitchenStateService } from '../../kitchen/service/kitchen-state.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let router: jasmine.SpyObj<Router>;
  let kitchenStateService: jasmine.SpyObj<KitchenStateService>;

  beforeEach(() => {
    localStorage.clear();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    kitchenStateService = jasmine.createSpyObj<KitchenStateService>('KitchenStateService', ['clearAll']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        { provide: KitchenStateService, useValue: kitchenStateService }
      ]
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('odtwarza sesję z localStorage tylko raz', () => {
    localStorage.setItem('accessToken', 'token-1');
    localStorage.setItem('user', JSON.stringify({ id: 1, email: 'admin@test.pl', role: 'ADMIN' }));

    service.initFromStorage();

    expect(service.isLoggedIn()).toBeTrue();
    expect(service.user()?.email).toBe('admin@test.pl');

    localStorage.setItem('user', JSON.stringify({ id: 2, email: 'user@test.pl', role: 'USER' }));
    service.initFromStorage();

    expect(service.user()?.email).toBe('admin@test.pl');
  });

  it('czyści uszkodzone dane sesji z localStorage', () => {
    localStorage.setItem('accessToken', 'token-1');
    localStorage.setItem('user', '{broken-json');

    service.initFromStorage();

    expect(service.isLoggedIn()).toBeFalse();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('po logout pozwala ponownie odtworzyć sesję z localStorage', () => {
    localStorage.setItem('accessToken', 'token-1');
    localStorage.setItem('user', JSON.stringify({ id: 1, email: 'admin@test.pl', role: 'ADMIN' }));
    service.initFromStorage();

    service.logout();
    localStorage.setItem('accessToken', 'token-2');
    localStorage.setItem('user', JSON.stringify({ id: 2, email: 'user@test.pl', role: 'USER' }));

    service.initFromStorage();

    expect(service.isLoggedIn()).toBeTrue();
    expect(service.user()?.email).toBe('user@test.pl');
    expect(kitchenStateService.clearAll).toHaveBeenCalledOnceWith();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
