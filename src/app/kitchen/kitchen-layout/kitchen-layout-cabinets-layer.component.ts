import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CabinetZone } from '../model/kitchen-state.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { VisualCabinetPosition } from './kitchen-layout-view-model.builder';

@Component({
  selector: 'g[appKitchenLayoutCabinetsLayer]',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kitchen-layout-cabinets-layer.component.html',
  styleUrls: ['./kitchen-layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KitchenLayoutCabinetsLayerComponent {
  @Input({ required: true }) positions: VisualCabinetPosition[] = [];
  @Input() showUpperCabinets = true;
  @Input() showCabinetLabels = true;
  @Input() editingCabinetId: string | null = null;

  protected trackByCabinetId = (_: number, pos: VisualCabinetPosition) => pos.cabinetId;
  protected trackByIndex = (index: number) => index;

  protected isEditing(cabinetId: string): boolean {
    return this.editingCabinetId === cabinetId;
  }

  protected getCabinetLabel(pos: VisualCabinetPosition, index: number): string {
    const num = index + 1;
    const suffix = this.getCabinetTypeSuffix(pos.type);
    if (suffix) {
      return `${num}(${suffix})`;
    }
    return pos.name || `${num}`;
  }

  protected enclosureDisplayY(type: string | undefined, zone: CabinetZone, displayY: number): number {
    return type === 'SIDE_PLATE_TO_FLOOR' && zone === 'TOP' ? 0 : displayY;
  }

  protected enclosureDisplayHeight(
    type: string | undefined,
    zone: CabinetZone,
    displayY: number,
    bodyHeight: number,
    feetHeight: number
  ): number {
    if (type === 'SIDE_PLATE_TO_FLOOR') {
      return zone === 'TOP' ? displayY + bodyHeight : bodyHeight + feetHeight;
    }
    return bodyHeight;
  }

  protected formatDimensionDiff(diff: number | undefined): string {
    if (!diff) return '';
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff}`;
  }

  protected isSignificantDiff(diff: number | undefined): boolean {
    if (!diff) return false;
    return Math.abs(diff) > 50;
  }

  private getCabinetTypeSuffix(type: KitchenCabinetType): string | null {
    switch (type) {
      case KitchenCabinetType.BASE_DISHWASHER:
      case KitchenCabinetType.BASE_DISHWASHER_FREESTANDING:
        return 'zmyw.';
      case KitchenCabinetType.BASE_SINK:
        return 'zlew';
      case KitchenCabinetType.UPPER_HOOD:
        return 'okap';
      case KitchenCabinetType.BASE_OVEN:
      case KitchenCabinetType.BASE_OVEN_FREESTANDING:
        return 'piek.';
      case KitchenCabinetType.BASE_FRIDGE:
        return 'lod.';
      case KitchenCabinetType.BASE_FRIDGE_FREESTANDING:
        return 'lod.wol.';
      default:
        return null;
    }
  }
}
