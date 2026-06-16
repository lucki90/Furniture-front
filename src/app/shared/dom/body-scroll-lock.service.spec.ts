import { TestBed } from '@angular/core/testing';
import { BodyScrollLockService } from './body-scroll-lock.service';

describe('BodyScrollLockService', () => {
  let service: BodyScrollLockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BodyScrollLockService);
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('locks and unlocks body scroll', () => {
    service.lock();

    expect(document.body.style.overflow).toBe('hidden');

    service.unlock();

    expect(document.body.style.overflow).toBe('');
  });

  it('keeps body locked until all locks are released', () => {
    service.lock();
    service.lock();

    service.unlock();

    expect(document.body.style.overflow).toBe('hidden');

    service.unlock();

    expect(document.body.style.overflow).toBe('');
  });

  it('restores previous overflow value', () => {
    document.body.style.overflow = 'auto';

    service.lock();
    service.unlock();

    expect(document.body.style.overflow).toBe('auto');
  });
});
