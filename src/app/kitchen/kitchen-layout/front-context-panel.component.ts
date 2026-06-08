import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CabinetTypeNamePipe } from '../cabinet-form/pipes/cabinet-type-name.pipe';
import {
  CabinetPosition,
  KitchenCabinet,
  WallWithCabinets,
  getCabinetZone
} from '../model/kitchen-state.model';
import { CabinetSide, WallType } from '../model/kitchen-project.model';
import { KitchenStateService } from '../service/kitchen-state.service';
import { KitchenGeometryService } from '../service/kitchen-geometry.service';
import { MiniWallPreviewComponent } from './mini-wall-preview.component';

interface WallCardVm {
  id: string;
  type: WallType;
  label: string;
  widthMm: number;
  heightMm: number;
  plinthHeightMm: number;
  plinthEnabled: boolean;
  countertopThicknessMm: number;
  upperFillerHeightMm: number;
  fillerWidthMm: number;
  cabinetCount: number;
  totalCost: number;
  fits: boolean;
  isActive: boolean;
  previewCabinets: KitchenCabinet[];
}

@Component({
  selector: 'app-front-context-panel',
  standalone: true,
  imports: [CommonModule, CabinetTypeNamePipe, MiniWallPreviewComponent],
  templateUrl: './front-context-panel.component.html',
  styleUrls: ['./front-context-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FrontContextPanelComponent {
  private readonly visibleCabinetsState = signal<KitchenCabinet[]>([]);
  private readonly selectedCabinetState = signal<KitchenCabinet | null>(null);
  private readonly selectedCabinetPositionState = signal<CabinetPosition | null>(null);
  private readonly isEditingCabinetState = signal(false);

  @Output() selectWall = new EventEmitter<string>();
  @Output() addWallRequested = new EventEmitter<void>();
  @Output() clearSelection = new EventEmitter<void>();
  @Output() editCabinet = new EventEmitter<string>();
  @Output() cloneCabinet = new EventEmitter<string>();
  @Output() removeCabinet = new EventEmitter<string>();

  @ViewChild('panelEl') private panelEl!: ElementRef<HTMLElement>;
  @ViewChild('detailsCardEl') private detailsCardEl!: ElementRef<HTMLElement>;

  private savedScrollTop = 0;
  private scrolledToDetails = false;
  private prevSelectedId: string | null = null;
  private prevIsEditing = false;

  /**
   * Scrolluje panel do karty szczegółów gdy szafka zostanie zaznaczona,
   * i przywraca pozycję gdy szafka zostanie odznaczona.
   */
  private readonly selectionScrollEffect = effect(() => {
    const selected = this.selectedCabinetState();
    const currentId = selected?.id ?? null;
    const prevId = this.prevSelectedId;
    this.prevSelectedId = currentId;

    const becameSelected = prevId === null && currentId !== null;
    const becameDeselected = prevId !== null && currentId === null;

    setTimeout(() => {
      const panel = this.panelEl?.nativeElement;
      if (!panel) return;

      if (becameSelected) {
        this.savedScrollTop = panel.scrollTop;
        this.scrolledToDetails = true;
        const detailsCard = this.detailsCardEl?.nativeElement;
        if (detailsCard) {
          panel.scrollTo({ top: detailsCard.offsetTop - 8, behavior: 'smooth' });
        }
      } else if (becameDeselected && this.scrolledToDetails) {
        this.scrolledToDetails = false;
        panel.scrollTo({ top: this.savedScrollTop, behavior: 'smooth' });
      }
    }, 60);
  });

  /**
   * Gdy użytkownik kliknie "Edytuj" (edycja startuje), scrolluje panel do karty
   * szczegółów — na wypadek gdy użytkownik zdążył przewinąć panel po zaznaczeniu szafki.
   */
  private readonly editingScrollEffect = effect(() => {
    const editing = this.isEditingCabinetState();
    const prevEditing = this.prevIsEditing;
    this.prevIsEditing = editing;

    if (!editing || prevEditing) return; // tylko false → true

    setTimeout(() => {
      const panel = this.panelEl?.nativeElement;
      const detailsCard = this.detailsCardEl?.nativeElement;
      if (panel && detailsCard) {
        panel.scrollTo({ top: detailsCard.offsetTop - 8, behavior: 'smooth' });
      }
    }, 60);
  });

  constructor(
    private readonly stateService: KitchenStateService,
    private readonly geometryService: KitchenGeometryService
  ) {}

  @Input() set visibleCabinets(value: KitchenCabinet[]) {
    this.visibleCabinetsState.set(value ?? []);
  }

  @Input() set selectedCabinet(value: KitchenCabinet | null) {
    this.selectedCabinetState.set(value);
  }

  @Input() set selectedCabinetPosition(value: CabinetPosition | null) {
    this.selectedCabinetPositionState.set(value);
  }

  @Input() set isEditingCabinet(value: boolean) {
    this.isEditingCabinetState.set(value);
  }

  readonly selectedWall = this.stateService.selectedWall;
  readonly selectedWallId = this.stateService.selectedWallId;
  readonly walls = this.stateService.walls;
  readonly visibleIslandSide = this.stateService.visibleIslandSide;

  readonly wallCards = computed((): WallCardVm[] => {
    const walls = this.walls();
    const selectedWallId = this.selectedWallId();
    const visibleIslandSide = this.visibleIslandSide();
    const fillerWidthMm = this.stateService.fillerWidthMm();
    const globalPlinthHeightMm = this.stateService.plinthHeightMm();
    const globalCountertopThicknessMm = this.stateService.countertopThicknessMm();
    const globalUpperFillerHeightMm = this.stateService.upperFillerHeightMm();

    return walls.map(wall => {
      const previewCabinets = this.getPreviewCabinetsForWall(
        wall,
        wall.id === selectedWallId ? visibleIslandSide : 'FRONT'
      );
      const usedBottom = this.geometryService.calculateUsedWidth(previewCabinets, 'BOTTOM', fillerWidthMm, wall.type);
      const usedTop = this.geometryService.calculateUsedWidth(previewCabinets, 'TOP', fillerWidthMm, wall.type);

      return {
        id: wall.id,
        type: wall.type,
        label: this.stateService.getWallLabel(wall.type),
        widthMm: wall.widthMm,
        heightMm: wall.heightMm,
        // Bug-fix 2026-06-08: nóżki zawsze obecne — przekazujemy realną wysokość cokołu niezależnie od flagi enabled.
        // Sam panel cokołu jest ukrywany przez plinthEnabled (mini-podgląd: buildPlinthRuns).
        plinthHeightMm: wall.plinthConfig?.heightMm ?? globalPlinthHeightMm,
        plinthEnabled: wall.plinthConfig?.enabled !== false,
        countertopThicknessMm: (wall.countertopConfig?.enabled ?? true)
          ? (wall.countertopConfig?.thicknessMm ?? globalCountertopThicknessMm)
          : 0,
        upperFillerHeightMm: globalUpperFillerHeightMm,
        fillerWidthMm,
        cabinetCount: previewCabinets.length,
        totalCost: wall.cabinets.reduce((sum, cabinet) => sum + (cabinet.calculatedResult?.totalCost ?? 0), 0),
        fits: usedBottom <= wall.widthMm && usedTop <= wall.widthMm,
        isActive: wall.id === selectedWallId,
        previewCabinets
      };
    });
  });

  readonly selectedCabinetOrder = computed(() => {
    const cabinet = this.selectedCabinetState();
    if (!cabinet) {
      return null;
    }

    const index = this.visibleCabinetsState().findIndex(item => item.id === cabinet.id);
    return index >= 0 ? index + 1 : null;
  });

  readonly selectedBottomCount = computed(() => {
    return this.visibleCabinetsState().filter(cabinet => getCabinetZone(cabinet) === 'BOTTOM').length;
  });

  readonly selectedUpperCount = computed(() => {
    return this.visibleCabinetsState().filter(cabinet => getCabinetZone(cabinet) === 'TOP').length;
  });

  readonly selectedTallCount = computed(() => {
    return this.visibleCabinetsState().filter(cabinet => getCabinetZone(cabinet) === 'FULL').length;
  });

  readonly selectedWallVisibleCost = computed(() => {
    return this.visibleCabinetsState().reduce((sum, cabinet) => sum + (cabinet.calculatedResult?.totalCost ?? 0), 0);
  });

  readonly showInspector = computed(() => this.selectedCabinetState() !== null);

  protected trackByWallId = (_: number, card: WallCardVm) => card.id;

  protected cabinetAccentClass(cabinet: KitchenCabinet | null): string {
    if (!cabinet) {
      return 'front-accent front-accent--bottom';
    }

    if (cabinet.type === 'CORNER_CABINET') {
      return 'front-accent front-accent--corner';
    }

    switch (getCabinetZone(cabinet)) {
      case 'TOP':
        return 'front-accent front-accent--top';
      case 'FULL':
        return 'front-accent front-accent--full';
      case 'BOTTOM':
      default:
        return 'front-accent front-accent--bottom';
    }
  }

  protected cabinetPropertyRows(cabinet: KitchenCabinet | null, position: CabinetPosition | null): Array<{ label: string; value: string }> {
    if (!cabinet) {
      return [];
    }

    return [
      { label: 'Pozycja X', value: position ? `${position.x} mm` : '-' },
      { label: 'Otwarcie', value: this.formatOpeningType(cabinet.openingType) }
    ];
  }

  protected summaryRows(): Array<{ label: string; value: string }> {
    const wall = this.selectedWall();
    if (!wall) {
      return [];
    }

    return [
      { label: 'Szerokosc', value: `${wall.widthMm} mm` },
      { label: 'Wysokosc', value: `${wall.heightMm} mm` },
      { label: 'Szafki', value: `${this.visibleCabinetsState().length} szt.` }
    ];
  }

  protected onWallCardClick(wallId: string): void {
    this.clearSelection.emit();
    this.selectWall.emit(wallId);
  }

  protected onClearSelection(): void {
    this.clearSelection.emit();
  }

  protected onEditSelectedCabinet(): void {
    const cabinet = this.selectedCabinetState();
    if (!cabinet || this.isEditingCabinetState()) {
      return;
    }
    this.editCabinet.emit(cabinet.id);
  }

  protected onCloneSelectedCabinet(): void {
    const cabinet = this.selectedCabinetState();
    if (!cabinet || this.isEditingCabinetState()) {
      return;
    }
    this.cloneCabinet.emit(cabinet.id);
  }

  protected onRemoveSelectedCabinet(): void {
    const cabinet = this.selectedCabinetState();
    if (!cabinet || this.isEditingCabinetState()) {
      return;
    }
    this.removeCabinet.emit(cabinet.id);
  }

  protected selectedCabinetValue(): KitchenCabinet | null {
    return this.selectedCabinetState();
  }

  protected selectedCabinetPositionValue(): CabinetPosition | null {
    return this.selectedCabinetPositionState();
  }

  protected isEditingCabinetValue(): boolean {
    return this.isEditingCabinetState();
  }

  protected formatPrice(value: number): string {
    return `${Math.round(value)} zl`;
  }

  protected formatCabinetCount(count: number): string {
    if (count === 1) return '1 szafka';
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
      return `${count} szafki`;
    }
    return `${count} szafek`;
  }

  private getPreviewCabinetsForWall(wall: WallWithCabinets, preferredSide: CabinetSide): KitchenCabinet[] {
    if (wall.type !== 'ISLAND') {
      return wall.cabinets;
    }

    return wall.cabinets.filter(cabinet => (cabinet.cabinetSide ?? 'FRONT') === preferredSide);
  }

  private formatOpeningType(openingType: string): string {
    switch (openingType) {
      case 'LEFT':
        return 'lewe';
      case 'RIGHT':
        return 'prawe';
      case 'TOP':
        return 'gorne';
      case 'PUSH_TO_OPEN':
        return 'push-to-open';
      case 'FURNITURE_HANDLE':
        return 'uchwyt meblowy';
      case 'GOLA':
        return 'gola';
      default:
        return openingType.toLowerCase();
    }
  }

}
