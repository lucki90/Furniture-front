import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CabinetVisualConfig,
  FrontElement,
  HandleConfig,
  PlinthConfig,
  FeetConfig,
  CabinetBaseType,
  HandleType,
  FrontType,
  DEFAULT_PLINTH_CONFIG,
  DEFAULT_HANDLE_CONFIG,
  generateDefaultFronts
} from '../cabinet-form/model/cabinet-visual-elements.model';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { CabinetZone } from '../model/kitchen-state.model';

/**
 * Dane wejściowe szafki do wizualizacji
 */
export interface CabinetDetailInput {
  type: KitchenCabinetType;
  width: number;
  height: number;
  depth: number;
  zone: CabinetZone;
  drawerQuantity?: number;
  visualConfig?: CabinetVisualConfig;
}

/**
 * Komponent do szczegółowej wizualizacji szafki z frontami, uchwytami i cokołem.
 * Renderuje widok frontalny szafki w SVG.
 */
@Component({
  selector: 'app-cabinet-detail-visualizer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cabinet-detail-visualizer.component.html',
  styleUrls: ['./cabinet-detail-visualizer.component.css']
})
export class CabinetDetailVisualizerComponent {

  // Wymiary SVG (protected dla dostępu z template)
  protected readonly SVG_PADDING = 10;
  private readonly MAX_SVG_WIDTH = 200;
  private readonly MAX_SVG_HEIGHT = 250;

  // Kolory
  private readonly CABINET_BODY_COLOR = '#d7ccc8';      // Korpus (jasny brąz)
  private readonly FRONT_COLOR = '#f5f5f5';              // Front (biały/jasny)
  private readonly FRONT_STROKE = '#9e9e9e';             // Obramowanie frontu
  private readonly HANDLE_COLOR = '#78909c';             // Uchwyt (metaliczny)
  private readonly PLINTH_COLOR = '#424242';             // Cokół (ciemny)
  private readonly FEET_COLOR = '#616161';               // Nóżki
  private readonly COUNTERTOP_COLOR = '#8d6e63';         // Blat
  private readonly HINGE_COLOR = '#90a4ae';              // Zawiasy

  // Input jako signal (protected dla dostępu z template)
  protected cabinetInput = signal<CabinetDetailInput | null>(null);

  @Input()
  set cabinet(value: CabinetDetailInput | null) {
    this.cabinetInput.set(value);
  }

  // Computed - skala dla dopasowania do SVG
  readonly scale = computed(() => {
    const cab = this.cabinetInput();
    if (!cab) return 1;

    const availableWidth = this.MAX_SVG_WIDTH - this.SVG_PADDING * 2;
    const availableHeight = this.MAX_SVG_HEIGHT - this.SVG_PADDING * 2;

    const scaleX = availableWidth / cab.width;
    const scaleY = availableHeight / cab.height;

    return Math.min(scaleX, scaleY, 0.3); // Max 0.3 dla czytelności
  });

  readonly svgWidth = computed(() => {
    const cab = this.cabinetInput();
    if (!cab) return 100;
    return cab.width * this.scale() + this.SVG_PADDING * 2;
  });

  readonly svgHeight = computed(() => {
    const cab = this.cabinetInput();
    if (!cab) return 100;
    return cab.height * this.scale() + this.SVG_PADDING * 2;
  });

  // Computed - konfiguracja wizualna (z domyślnymi wartościami)
  readonly visualConfig = computed((): CabinetVisualConfig | null => {
    const cab = this.cabinetInput();
    if (!cab) return null;

    // Jeśli jest przekazana konfiguracja, użyj jej
    if (cab.visualConfig) {
      return cab.visualConfig;
    }

    // Generuj domyślną konfigurację
    return this.generateDefaultConfig(cab);
  });

  // Computed - wysokość cokołu/nóżek
  readonly baseHeight = computed(() => {
    const config = this.visualConfig();
    if (!config) return 0;

    if (config.baseType === 'PLINTH' && config.plinth) {
      return config.plinth.height;
    }
    if (config.baseType === 'FEET' && config.feet) {
      return config.feet.height;
    }
    return 0;
  });

  // Computed - wysokość blatu
  readonly countertopHeight = computed(() => {
    const config = this.visualConfig();
    const cab = this.cabinetInput();
    if (!config || !cab || cab.zone !== 'BOTTOM') return 0;
    return config.hasCountertop ? 38 : 0; // Standardowa grubość blatu
  });

  // Computed - wysokość korpusu (bez cokołu i blatu)
  readonly bodyHeight = computed(() => {
    const cab = this.cabinetInput();
    if (!cab) return 0;
    return cab.height - this.baseHeight() - this.countertopHeight();
  });

  // Computed - fronty do wyświetlenia
  readonly fronts = computed((): FrontElement[] => {
    const config = this.visualConfig();
    return config?.fronts || [];
  });

  // ============ METODY POMOCNICZE DLA TEMPLATE ============

  /**
   * Pozycja X korpusu szafki
   */
  get bodyX(): number {
    return this.SVG_PADDING;
  }

  /**
   * Pozycja Y korpusu szafki (od góry, po odjęciu blatu)
   */
  get bodyY(): number {
    return this.SVG_PADDING + this.countertopHeight() * this.scale();
  }

  /**
   * Szerokość korpusu
   */
  get bodyWidth(): number {
    const cab = this.cabinetInput();
    return cab ? cab.width * this.scale() : 0;
  }

  /**
   * Wysokość korpusu (przeskalowana)
   */
  get bodyHeightScaled(): number {
    return this.bodyHeight() * this.scale();
  }

  /**
   * Pozycja Y cokołu/nóżek
   */
  get baseY(): number {
    return this.bodyY + this.bodyHeightScaled;
  }

  /**
   * Wysokość cokołu (przeskalowana)
   */
  get baseHeightScaled(): number {
    return this.baseHeight() * this.scale();
  }

  /**
   * Czy pokazywać cokół
   */
  get showPlinth(): boolean {
    const config = this.visualConfig();
    return config?.baseType === 'PLINTH' && this.baseHeight() > 0;
  }

  /**
   * Czy pokazywać nóżki
   */
  get showFeet(): boolean {
    const config = this.visualConfig();
    return config?.baseType === 'FEET' && this.baseHeight() > 0;
  }

  /**
   * Czy pokazywać blat
   */
  get showCountertop(): boolean {
    return this.countertopHeight() > 0;
  }

  /**
   * Wysokość blatu (przeskalowana)
   */
  get countertopHeightScaled(): number {
    return this.countertopHeight() * this.scale();
  }

  /**
   * Konfiguracja cokołu
   */
  get plinthConfig(): PlinthConfig | undefined {
    return this.visualConfig()?.plinth;
  }

  /**
   * Konfiguracja nóżek
   */
  get feetConfig(): FeetConfig | undefined {
    return this.visualConfig()?.feet;
  }

  /**
   * Oblicza pozycję X frontu (przeskalowana)
   */
  getFrontX(front: FrontElement): number {
    return this.bodyX + front.positionX * this.scale();
  }

  /**
   * Oblicza pozycję Y frontu (przeskalowana, od góry korpusu)
   * positionY w modelu to od dołu korpusu, więc musimy odwrócić
   */
  getFrontY(front: FrontElement): number {
    const bodyTop = this.bodyY;
    const bodyH = this.bodyHeight();
    // Konwertuj z "od dołu" na "od góry"
    const fromTop = bodyH - front.positionY - front.height;
    return bodyTop + fromTop * this.scale();
  }

  /**
   * Szerokość frontu (przeskalowana)
   */
  getFrontWidth(front: FrontElement): number {
    return front.width * this.scale();
  }

  /**
   * Wysokość frontu (przeskalowana)
   */
  getFrontHeight(front: FrontElement): number {
    return front.height * this.scale();
  }

  /**
   * Zwraca ścieżkę SVG dla uchwytu
   */
  getHandlePath(front: FrontElement): string {
    const handle = front.handle || this.visualConfig()?.defaultHandle;
    if (!handle || handle.type === 'NONE' || handle.type === 'PUSH_TO_OPEN') {
      return '';
    }

    const frontX = this.getFrontX(front);
    const frontY = this.getFrontY(front);
    const frontW = this.getFrontWidth(front);
    const frontH = this.getFrontHeight(front);
    const scale = this.scale();

    const handleLength = (handle.length || 128) * scale;
    const offset = (handle.offsetFromEdge || 30) * scale;

    let x1: number, y1: number, x2: number, y2: number;

    switch (handle.type) {
      case 'BAR':
        // Uchwyt listwowy (poziomy lub pionowy)
        if (handle.orientation === 'HORIZONTAL') {
          const centerX = frontX + frontW / 2;
          x1 = centerX - handleLength / 2;
          x2 = centerX + handleLength / 2;

          if (handle.position === 'TOP') {
            y1 = y2 = frontY + offset;
          } else if (handle.position === 'BOTTOM') {
            y1 = y2 = frontY + frontH - offset;
          } else {
            y1 = y2 = frontY + frontH / 2;
          }
        } else {
          // VERTICAL
          const centerY = frontY + frontH / 2;
          y1 = centerY - handleLength / 2;
          y2 = centerY + handleLength / 2;

          if (handle.position === 'SIDE_LEFT') {
            x1 = x2 = frontX + offset;
          } else if (handle.position === 'SIDE_RIGHT') {
            x1 = x2 = frontX + frontW - offset;
          } else {
            x1 = x2 = frontX + frontW / 2;
          }
        }
        return `M ${x1} ${y1} L ${x2} ${y2}`;

      case 'KNOB':
        // Gałka - punkt
        return ''; // Będzie renderowana jako circle

      default:
        return '';
    }
  }

  /**
   * Czy uchwyt to gałka (renderowana jako circle)
   */
  isKnobHandle(front: FrontElement): boolean {
    const handle = front.handle || this.visualConfig()?.defaultHandle;
    return handle?.type === 'KNOB';
  }

  /**
   * Pozycja gałki X
   */
  getKnobX(front: FrontElement): number {
    const handle = front.handle || this.visualConfig()?.defaultHandle;
    if (!handle) return 0;

    const frontX = this.getFrontX(front);
    const frontW = this.getFrontWidth(front);
    const offset = (handle.offsetFromEdge || 30) * this.scale();

    if (handle.position === 'SIDE_LEFT') {
      return frontX + offset;
    } else if (handle.position === 'SIDE_RIGHT') {
      return frontX + frontW - offset;
    }
    return frontX + frontW / 2;
  }

  /**
   * Pozycja gałki Y
   */
  getKnobY(front: FrontElement): number {
    const handle = front.handle || this.visualConfig()?.defaultHandle;
    if (!handle) return 0;

    const frontY = this.getFrontY(front);
    const frontH = this.getFrontHeight(front);
    const offset = (handle.offsetFromEdge || 30) * this.scale();

    if (handle.position === 'TOP') {
      return frontY + offset;
    } else if (handle.position === 'BOTTOM') {
      return frontY + frontH - offset;
    }
    return frontY + frontH / 2;
  }

  /**
   * Czy front ma zawiasy (drzwi)
   */
  hasHinges(front: FrontElement): boolean {
    return front.type === 'DOOR_SINGLE' || front.type === 'DOOR_DOUBLE';
  }

  /**
   * Pozycje zawiasów dla frontu
   */
  getHingePositions(front: FrontElement): { x: number; y: number }[] {
    if (!this.hasHinges(front)) return [];

    const frontX = this.getFrontX(front);
    const frontY = this.getFrontY(front);
    const frontW = this.getFrontWidth(front);
    const frontH = this.getFrontHeight(front);

    const hingeX = front.hingesSide === 'RIGHT'
      ? frontX + frontW - 2
      : frontX + 2;

    // 2-3 zawiasy w zależności od wysokości
    const hingeCount = frontH > 60 ? 3 : 2;
    const positions: { x: number; y: number }[] = [];

    for (let i = 0; i < hingeCount; i++) {
      const y = frontY + (frontH / (hingeCount + 1)) * (i + 1);
      positions.push({ x: hingeX, y });
    }

    return positions;
  }

  /**
   * Pozycje nóżek
   */
  getFeetPositions(): { x: number; y: number }[] {
    const config = this.feetConfig;
    if (!config) return [];

    const positions: { x: number; y: number }[] = [];
    const count = config.quantity || 4;
    const width = this.bodyWidth;
    const y = this.baseY + this.baseHeightScaled - 3;

    // Rozłóż nóżki równomiernie
    const spacing = width / (count - 1 || 1);
    for (let i = 0; i < count; i++) {
      positions.push({
        x: this.bodyX + spacing * i,
        y
      });
    }

    return positions;
  }

  /**
   * Kolor uchwytu
   */
  getHandleColor(front: FrontElement): string {
    const handle = front.handle || this.visualConfig()?.defaultHandle;
    return handle?.color || this.HANDLE_COLOR;
  }

  /**
   * Kolor cokołu
   */
  getPlinthColor(): string {
    return this.plinthConfig?.color || this.PLINTH_COLOR;
  }

  /**
   * Kolor nóżek
   */
  getFeetColor(): string {
    return this.feetConfig?.color || this.FEET_COLOR;
  }

  // Kolory dostępne w template
  get cabinetBodyColor(): string { return this.CABINET_BODY_COLOR; }
  get frontColor(): string { return this.FRONT_COLOR; }
  get frontStroke(): string { return this.FRONT_STROKE; }
  get countertopColor(): string { return this.COUNTERTOP_COLOR; }
  get hingeColor(): string { return this.HINGE_COLOR; }

  /**
   * Cofnięcie cokołu (przeskalowane)
   */
  get plinthSetback(): number {
    const setback = this.plinthConfig?.setback || 40;
    return setback * this.scale();
  }

  // ============ GENEROWANIE DOMYŚLNEJ KONFIGURACJI ============

  private generateDefaultConfig(cab: CabinetDetailInput): CabinetVisualConfig {
    const isBottom = cab.zone === 'BOTTOM';
    const isFull = cab.zone === 'FULL';

    // Wysokość użytkowa (bez cokołu dla dolnych)
    const plinthHeight = (isBottom || isFull) ? 100 : 0;
    const countertopHeight = isBottom ? 38 : 0;
    const usableHeight = cab.height - plinthHeight - countertopHeight;

    // Generuj fronty
    const fronts = generateDefaultFronts(
      cab.type,
      cab.width,
      usableHeight,
      cab.drawerQuantity
    );

    // Dodaj domyślne uchwyty do frontów
    fronts.forEach(front => {
      front.handle = this.getDefaultHandleForFront(front);
    });

    return {
      baseType: (isBottom || isFull) ? 'PLINTH' : 'NONE',
      plinth: (isBottom || isFull) ? { ...DEFAULT_PLINTH_CONFIG } : undefined,
      fronts,
      defaultHandle: { ...DEFAULT_HANDLE_CONFIG },
      hasCountertop: isBottom,
      countertopOverhang: 20
    };
  }

  private getDefaultHandleForFront(front: FrontElement): HandleConfig {
    switch (front.type) {
      case 'DRAWER':
        return {
          type: 'BAR',
          length: Math.min(128, front.width * 0.6),
          position: 'MIDDLE',
          orientation: 'HORIZONTAL',
          color: '#78909c',
          offsetFromEdge: front.height / 2
        };

      case 'DOOR_SINGLE':
      case 'DOOR_DOUBLE':
        return {
          type: 'BAR',
          length: 128,
          position: front.hingesSide === 'LEFT' ? 'SIDE_RIGHT' : 'SIDE_LEFT',
          orientation: 'VERTICAL',
          color: '#78909c',
          offsetFromEdge: 30
        };

      default:
        return { ...DEFAULT_HANDLE_CONFIG };
    }
  }
}
