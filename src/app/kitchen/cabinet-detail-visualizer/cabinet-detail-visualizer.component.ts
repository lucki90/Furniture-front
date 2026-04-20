import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CabinetVisualConfig,
  FrontElement,
  PlinthConfig,
  FeetConfig
} from '../cabinet-form/model/cabinet-visual-elements.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { CabinetZone } from '../model/kitchen-state.model';
import { CabinetDetailFrontsLayerComponent } from './cabinet-detail-fronts-layer.component';
import {
  buildCabinetDetailGeometry,
  buildDefaultCabinetVisualConfig,
  CabinetDetailGeometry,
  getCabinetBaseHeight,
  getCabinetCountertopHeight,
  getFeetColor,
  getFeetPositions,
  getPlinthColor,
} from './cabinet-detail-visualizer.utils';

export interface CabinetDetailInput {
  type: KitchenCabinetType;
  width: number;
  height: number;
  depth: number;
  zone: CabinetZone;
  drawerQuantity?: number;
  visualConfig?: CabinetVisualConfig;
}

@Component({
  selector: 'app-cabinet-detail-visualizer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CabinetDetailFrontsLayerComponent],
  templateUrl: './cabinet-detail-visualizer.component.html',
  styleUrls: ['./cabinet-detail-visualizer.component.css']
})
export class CabinetDetailVisualizerComponent {

  private readonly SVG_PADDING = 10;
  private readonly MAX_SVG_WIDTH = 200;
  private readonly MAX_SVG_HEIGHT = 250;

  private readonly CABINET_BODY_COLOR = '#d7ccc8';
  private readonly FRONT_COLOR = '#f5f5f5';
  private readonly FRONT_STROKE = '#9e9e9e';
  private readonly PLINTH_COLOR = '#424242';
  private readonly FEET_COLOR = '#616161';
  private readonly COUNTERTOP_COLOR = '#8d6e63';
  private readonly HINGE_COLOR = '#90a4ae';

  protected cabinetInput = signal<CabinetDetailInput | null>(null);

  @Input()
  set cabinet(value: CabinetDetailInput | null) {
    this.cabinetInput.set(value);
  }

  readonly visualConfig = computed((): CabinetVisualConfig | null => {
    const cabinet = this.cabinetInput();
    if (!cabinet) {
      return null;
    }

    return cabinet.visualConfig ?? buildDefaultCabinetVisualConfig(cabinet);
  });

  readonly geometry = computed<CabinetDetailGeometry | null>(() => {
    const cabinet = this.cabinetInput();
    const config = this.visualConfig();
    if (!cabinet || !config) {
      return null;
    }

    return buildCabinetDetailGeometry(cabinet, config, {
      svgPadding: this.SVG_PADDING,
      maxSvgWidth: this.MAX_SVG_WIDTH,
      maxSvgHeight: this.MAX_SVG_HEIGHT
    });
  });

  readonly scale = computed(() => this.geometry()?.scale ?? 1);
  readonly svgWidth = computed(() => this.geometry()?.svgWidth ?? 100);
  readonly svgHeight = computed(() => this.geometry()?.svgHeight ?? 100);
  readonly baseHeight = computed(() => this.visualConfig() ? getCabinetBaseHeight(this.visualConfig()!) : 0);
  readonly countertopHeight = computed(() => {
    const cabinet = this.cabinetInput();
    const config = this.visualConfig();
    if (!cabinet || !config) {
      return 0;
    }

    return getCabinetCountertopHeight(config, cabinet.zone);
  });
  readonly bodyHeight = computed(() => this.geometry()?.bodyHeight ?? 0);
  readonly fronts = computed((): FrontElement[] => this.visualConfig()?.fronts || []);

  get bodyX(): number {
    return this.geometry()?.bodyX ?? this.SVG_PADDING;
  }

  get bodyY(): number {
    return this.geometry()?.bodyY ?? this.SVG_PADDING;
  }

  get bodyWidth(): number {
    return this.geometry()?.bodyWidth ?? 0;
  }

  get bodyHeightScaled(): number {
    return this.geometry()?.bodyHeightScaled ?? 0;
  }

  get baseY(): number {
    return this.geometry()?.baseY ?? 0;
  }

  get baseHeightScaled(): number {
    return this.geometry()?.baseHeightScaled ?? 0;
  }

  get showPlinth(): boolean {
    const config = this.visualConfig();
    return config?.baseType === 'PLINTH' && this.baseHeight() > 0;
  }

  get showFeet(): boolean {
    const config = this.visualConfig();
    return config?.baseType === 'FEET' && this.baseHeight() > 0;
  }

  get showCountertop(): boolean {
    return this.countertopHeight() > 0;
  }

  get countertopHeightScaled(): number {
    return this.geometry()?.countertopHeightScaled ?? 0;
  }

  get plinthConfig(): PlinthConfig | undefined {
    return this.visualConfig()?.plinth;
  }

  get feetConfig(): FeetConfig | undefined {
    return this.visualConfig()?.feet;
  }

  getFeetPositions(): { x: number; y: number }[] {
    const geometry = this.geometry();
    if (!geometry) {
      return [];
    }

    return getFeetPositions(this.feetConfig, geometry);
  }

  getPlinthColor(): string {
    return getPlinthColor(this.plinthConfig, this.PLINTH_COLOR);
  }

  getFeetColor(): string {
    return getFeetColor(this.feetConfig, this.FEET_COLOR);
  }

  get cabinetBodyColor(): string { return this.CABINET_BODY_COLOR; }
  get frontColor(): string { return this.FRONT_COLOR; }
  get frontStroke(): string { return this.FRONT_STROKE; }
  get countertopColor(): string { return this.COUNTERTOP_COLOR; }
  get hingeColor(): string { return this.HINGE_COLOR; }

  get plinthSetback(): number {
    return this.geometry()?.plinthSetback ?? 0;
  }
}
