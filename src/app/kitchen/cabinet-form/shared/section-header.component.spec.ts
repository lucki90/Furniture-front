import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionHeaderComponent } from './section-header.component';

@Component({
  standalone: true,
  imports: [SectionHeaderComponent],
  template: `
    <app-cabinet-section-header title="Konfiguracja szafki">
      <span class="suffix">(2)</span>
    </app-cabinet-section-header>
  `
})
class HostComponent {}

describe('SectionHeaderComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders title and projected content', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Konfiguracja szafki');
    expect(text).toContain('(2)');
  });
});
