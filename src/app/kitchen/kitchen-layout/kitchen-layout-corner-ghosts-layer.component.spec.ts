import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KitchenLayoutCornerGhostsLayerComponent } from './kitchen-layout-corner-ghosts-layer.component';
import { CornerGhostView, CornerReservedZoneView } from './kitchen-layout-corner-ghosts.builder';

@Component({
  standalone: true,
  imports: [KitchenLayoutCornerGhostsLayerComponent],
  template: `
    <svg>
      <g appKitchenLayoutCornerGhostsLayer [ghosts]="ghosts" [reservedZones]="reservedZones"></g>
    </svg>
  `
})
class TestHostComponent {
  ghosts: CornerGhostView[] = [
    {
      key: 'END|m1',
      cabinetId: 'm1',
      kind: 'SIDE_PROFILE',
      zone: 'BOTTOM',
      body: { x: 911, y: 178, width: 289, height: 72 },
      front: null,
      countertop: { x: 900, y: 160, width: 300, height: 4 },
      conflict: false,
      title: 'Ściana główna: m1'
    },
    {
      key: 'END|mc',
      cabinetId: 'mc',
      kind: 'L_ARM',
      zone: 'BOTTOM',
      body: { x: 750, y: 178, width: 450, height: 72 },
      front: { x: 750, y: 178, width: 186, height: 72 },
      countertop: null,
      conflict: true,
      title: 'Ściana główna: mc — koliduje w narożniku'
    }
  ];
  reservedZones: CornerReservedZoneView[] = [
    { key: 'START|BASE', rect: { x: 0, y: 164, width: 314, height: 96 }, title: 'Strefa narożna dolna: 628 mm' }
  ];
}

describe('KitchenLayoutCornerGhostsLayerComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TestHostComponent] }).compileComponents();
    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  it('rysuje strefę narożną i cienie z korpusem, frontem ramienia i krawędzią blatu', () => {
    const zone = root.querySelector('rect.corner-reserved-zone');
    expect(zone?.getAttribute('width')).toBe('314');
    expect(zone?.querySelector('title')?.textContent).toContain('628 mm');

    const ghosts = root.querySelectorAll('g.corner-ghost');
    expect(ghosts.length).toBe(2);
    expect(ghosts[0].getAttribute('data-cabinet-id')).toBe('m1');
    expect(ghosts[0].querySelector('rect.corner-ghost-body')?.getAttribute('x')).toBe('911');
    expect(ghosts[0].querySelector('rect.corner-ghost-countertop')?.getAttribute('width')).toBe('300');
    expect(ghosts[0].querySelector('rect.corner-ghost-front')).toBeNull();
    expect(ghosts[1].querySelector('rect.corner-ghost-front')?.getAttribute('width')).toBe('186');
  });

  it('oznacza kolizję klasą i tytułem cienia', () => {
    const ghosts = root.querySelectorAll('g.corner-ghost');

    expect(ghosts[0].classList.contains('corner-ghost--conflict')).toBeFalse();
    expect(ghosts[1].classList.contains('corner-ghost--conflict')).toBeTrue();
    expect(ghosts[1].querySelector('title')?.textContent).toContain('koliduje');
  });
});
