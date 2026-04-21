import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EmptyStateComponent } from './empty-state.component';

@Component({
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    <app-empty-state icon="📁" title="Brak danych" message="Nic tu jeszcze nie ma.">
      <button type="button">Dodaj</button>
    </app-empty-state>
  `
})
class HostComponent {}

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders icon, title, message and projected action', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('📁');
    expect(text).toContain('Brak danych');
    expect(text).toContain('Nic tu jeszcze nie ma.');
    expect(text).toContain('Dodaj');
  });

  it('supports compact mode', () => {
    const compactFixture = TestBed.createComponent(EmptyStateComponent);
    compactFixture.componentInstance.message = 'Kompaktowy stan';
    compactFixture.componentInstance.compact = true;
    compactFixture.detectChanges();

    const root = compactFixture.debugElement.query(By.css('.empty-state'));
    expect(root.nativeElement.classList).toContain('empty-state--compact');
  });
});
