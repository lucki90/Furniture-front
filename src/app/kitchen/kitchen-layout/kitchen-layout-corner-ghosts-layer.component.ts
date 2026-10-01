import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CornerGhostView, CornerReservedZoneView } from './kitchen-layout-corner-ghosts.builder';

/**
 * Szafki sąsiednich ścian przy narożniku i strefy narożne oglądanej ściany. Warstwa tylko informacyjna: półprzezroczysta
 * i bez zdarzeń myszy, jak cień drugiej strony wyspy. Kolizja w narożniku ma czerwony obrys.
 */
@Component({
  selector: 'g[appKitchenLayoutCornerGhostsLayer]',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kitchen-layout-corner-ghosts-layer.component.html',
  styleUrls: ['./kitchen-layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KitchenLayoutCornerGhostsLayerComponent {
  @Input() ghosts: CornerGhostView[] = [];
  @Input() reservedZones: CornerReservedZoneView[] = [];

  protected trackByKey = (_: number, item: { key: string }) => item.key;
}
