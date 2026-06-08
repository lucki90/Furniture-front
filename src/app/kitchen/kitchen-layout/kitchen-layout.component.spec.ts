import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { CabinetPosition, WallWithCabinets } from '../model/kitchen-state.model';
import { CabinetSide } from '../model/kitchen-project.model';
import { KitchenStateService } from '../service/kitchen-state.service';
import { KitchenLayoutComponent } from './kitchen-layout.component';

describe('KitchenLayoutComponent', () => {
  let component: KitchenLayoutComponent;
  let fixture: ComponentFixture<KitchenLayoutComponent>;
  let stateService: KitchenStateServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KitchenLayoutComponent],
      providers: [{ provide: KitchenStateService, useClass: KitchenStateServiceStub }]
    }).compileComponents();

    fixture = TestBed.createComponent(KitchenLayoutComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(KitchenStateService) as unknown as KitchenStateServiceStub;
    fixture.detectChanges();
  });

  it('should compute 405mm countertop length for a cabinet run flush to the wall edge', () => {
    stateService.setCabinetRun(0);
    fixture.detectChanges();

    expect(component.countertopDimensions()?.lengthMm).toBe(405);
    expect(component.countertopSegmentLabels()[0].lengthMm).toBe(405);
    expect(component.countertopZoneRects()[0].x).toBe(0);
  });

  it('should compute 410mm countertop length when the cabinet run is offset from the wall edge', () => {
    stateService.setCabinetRun(100);
    fixture.detectChanges();

    expect(component.countertopDimensions()?.lengthMm).toBe(410);
    expect(component.countertopSegmentLabels()[0].lengthMm).toBe(410);
    expect(component.countertopZoneRects()[0].x).toBeCloseTo(100 * component.scaleFactor() - 5 * component.scaleFactor(), 3);
  });

  it('should render fit bar inline with svg toolbar controls', () => {
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const toolbar = root.querySelector('.svg-toolbar--top');
    const fitBar = root.querySelector('.fit-bar--inline');
    const actions = root.querySelector('.svg-toolbar-actions');

    expect(toolbar).not.toBeNull();
    expect(fitBar).not.toBeNull();
    expect(actions).not.toBeNull();
    expect(toolbar?.textContent).toContain('400 / 3000 mm');
    expect((fitBar as HTMLElement).compareDocumentPosition(actions as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should render right context panel with wall cards and wall summary by default', () => {
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-front-context-panel')).not.toBeNull();
    expect(root.querySelectorAll('.wall-card').length).toBe(1);
    expect(root.querySelector('.context-heading')?.textContent).toContain('Podsumowanie sciany');
    expect(root.textContent).toContain('Razem sciana');
  });

  describe('Plinth checkbox controls only the plinth panel, never the feet (bug-fix 2026-06-08)', () => {
    it('hides the plinth panel but keeps the feet when plinth is disabled', () => {
      stateService.setPlinthEnabled(false);
      fixture.detectChanges();

      // Panel cokołu znika...
      expect(component.plinthSegments()).toEqual([]);
      // ...ale nóżki zostają (feetHeight > 0 dla szafki dolnej).
      const bottom = component.visualPositions().find(p => p.zone === 'BOTTOM');
      expect(bottom).toBeDefined();
      expect(bottom!.feetHeight).toBeGreaterThan(0);
      expect(bottom!.feet.length).toBeGreaterThan(0);
    });

    it('renders both the plinth panel and the feet when plinth is enabled', () => {
      stateService.setPlinthEnabled(true);
      fixture.detectChanges();

      expect(component.plinthSegments().length).toBeGreaterThan(0);
      const bottom = component.visualPositions().find(p => p.zone === 'BOTTOM');
      expect(bottom!.feetHeight).toBeGreaterThan(0);
    });
  });

  describe('Delete shortcut', () => {
    function dispatchDelete(target: EventTarget = document.body): void {
      const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: target });
      document.dispatchEvent(event);
    }

    it('emits removeCabinet and clears selection when a cabinet is selected', () => {
      const removed: string[] = [];
      component.removeCabinet.subscribe((id: string) => removed.push(id));

      // zaznacz szafkę
      (component as any).selectedFrontCabinetId.set('base-1');

      dispatchDelete();

      expect(removed).toEqual(['base-1']);
      expect(component.selectedFrontCabinetId()).toBeNull();
    });

    it('does nothing when no cabinet is selected', () => {
      const removed: string[] = [];
      component.removeCabinet.subscribe((id: string) => removed.push(id));

      (component as any).selectedFrontCabinetId.set(null);
      dispatchDelete();

      expect(removed).toEqual([]);
    });

    it('does nothing when focus is inside an INPUT', () => {
      const removed: string[] = [];
      component.removeCabinet.subscribe((id: string) => removed.push(id));

      (component as any).selectedFrontCabinetId.set('base-1');

      const input = document.createElement('input');
      document.body.appendChild(input);
      dispatchDelete(input);
      document.body.removeChild(input);

      expect(removed).toEqual([]);
    });
  });

});

class KitchenStateServiceStub {
  readonly showCountertop = signal(true);
  readonly showUpperCabinets = signal(true);
  readonly visibleIslandSide = signal<CabinetSide>('FRONT');
  readonly selectedWallId = signal<string | null>('wall-1');
  readonly plinthHeightMm = signal(100);
  readonly fillerWidthMm = signal(50);
  readonly countertopThicknessMm = signal(38);
  readonly upperFillerHeightMm = signal(100);
  readonly fitsOnWall = signal(true);
  readonly totalWidth = signal(400);
  readonly remainingWidth = signal(2600);
  readonly usedWidthBottom = signal(400);
  readonly usedWidthTop = signal(0);
  readonly remainingWidthBottom = signal(2600);
  readonly remainingWidthTop = signal(3000);

  private readonly cabinet = {
    id: 'base-1',
    type: KitchenCabinetType.BASE_ONE_DOOR,
    width: 400,
    depth: 560,
    height: 720,
    positionY: 100,
    openingType: 'LEFT',
    shelfQuantity: 1
  } as any;

  private readonly selectedWallSignal = signal<WallWithCabinets>(this.buildWall());
  private readonly cabinetPositionsSignal = signal<CabinetPosition[]>([
    { cabinetId: 'base-1', x: 0, y: 100, width: 400, height: 720 }
  ]);

  readonly selectedWall = this.selectedWallSignal.asReadonly();
  readonly walls = computed(() => [this.selectedWallSignal()]);
  readonly cabinets = computed(() => this.selectedWallSignal().cabinets);
  readonly cabinetPositions = this.cabinetPositionsSignal.asReadonly();
  readonly wall = computed(() => ({
    length: this.selectedWallSignal().widthMm,
    height: this.selectedWallSignal().heightMm
  }));

  setCabinetRun(startX: number): void {
    this.cabinetPositionsSignal.set([{ cabinetId: 'base-1', x: startX, y: 100, width: 400, height: 720 }]);
  }

  setPlinthEnabled(enabled: boolean): void {
    const wall = this.selectedWallSignal();
    this.selectedWallSignal.set({
      ...wall,
      plinthConfig: { enabled, heightMm: 100 } as any
    });
  }

  getWallLabel(): string {
    return 'Sciana glowna';
  }

  selectWall(wallId: string): void {
    this.selectedWallId.set(wallId);
  }

  private buildWall(): WallWithCabinets {
    return {
      id: 'wall-1',
      type: 'MAIN',
      widthMm: 3000,
      heightMm: 2600,
      cabinets: [this.cabinet],
      countertopConfig: {
        enabled: true,
        manualDepthMm: 600,
        sideOverhangExtraMm: 5,
        thicknessMm: 38
      }
    };
  }
}
