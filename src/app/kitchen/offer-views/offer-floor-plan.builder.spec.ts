import { TestBed } from '@angular/core/testing';
import { WALL_TYPES, WallType } from '../model/kitchen-project.model';
import { KitchenWorkspaceStore } from '../service/kitchen-workspace.store';
import { KitchenProjectLayoutService } from '../service/kitchen-project-layout.service';
import { buildOfferFloorPlan, OfferFloorPlanInput } from './offer-floor-plan.builder';
import { seedLKitchenWithIsland } from './offer-views.test-fixtures';

const wallLabel = (type: WallType) => WALL_TYPES.find(wallType => wallType.value === type)?.label ?? type;

describe('buildOfferFloorPlan — rzut z góry do oferty', () => {
  let store: KitchenWorkspaceStore;
  let layoutService: KitchenProjectLayoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(KitchenWorkspaceStore);
    layoutService = TestBed.inject(KitchenProjectLayoutService);
  });

  function floorPlanInput(overrides: Partial<OfferFloorPlanInput> = {}): OfferFloorPlanInput {
    return {
      walls: store.walls(),
      roomWidthMm: null,
      roomDepthMm: null,
      plinthHeightMm: 100,
      upperFillerHeightMm: 100,
      fillerWidthMm: 50,
      layout: layoutService.layout(),
      wallLabel,
      ...overrides
    };
  }

  function parse(svg: string): Document {
    return new DOMParser().parseFromString(svg, 'image/svg+xml');
  }

  it('ściany są pełnymi pasami, a każda ma podpis z długością (także ściana bez szafek)', () => {
    seedLKitchenWithIsland(store);

    const doc = parse(buildOfferFloorPlan(floorPlanInput()).svg);

    expect(doc.querySelector('parsererror')).toBeNull();
    const labels = Array.from(doc.querySelectorAll('text')).map(element => element.textContent);
    expect(labels).toEqual([
      'Ściana główna · 3600 mm',
      'Ściana lewa · 2400 mm',
      'Ściana prawa · 2000 mm',
      'Wyspa kuchenna · 2400 mm'
    ]);
    // pas ściany bez wyspy: MAIN, LEFT, RIGHT
    expect(doc.querySelectorAll('rect[fill="#334155"]').length).toBe(3);
  });

  it('szafki wiszące są linią przerywaną, blaty jasną płaszczyzną, a rysunek jest przycięty do zawartości', () => {
    seedLKitchenWithIsland(store);

    const drawing = buildOfferFloorPlan(floorPlanInput());
    const doc = parse(drawing.svg);

    // 3 wiszące; obrys szafki L także jest ścieżką, ale bez przerywania
    expect(doc.querySelectorAll('[stroke-dasharray="2 1.2"]').length).toBe(3);
    expect(doc.querySelectorAll('[fill="#f1f5f9"]').length).toBeGreaterThanOrEqual(3);
    expect(drawing.width).toBeLessThan(320);
    expect(drawing.height).toBeLessThan(252);
  });

  it('obrys pomieszczenia pojawia się tylko z wymiarami pomieszczenia', () => {
    seedLKitchenWithIsland(store);

    expect(buildOfferFloorPlan(floorPlanInput()).svg).not.toContain('Pomieszczenie');
    expect(buildOfferFloorPlan(floorPlanInput({ roomWidthMm: 4000, roomDepthMm: 3500 })).svg)
      .toContain('Pomieszczenie 4000 × 3500 mm');
  });

  it('wyłączony blat ściany nie jest rysowany', () => {
    store.updateWall('wall-1', {
      cabinets: [{ id: 'b', type: 'BASE_ONE_DOOR', width: 600, height: 720, depth: 560, openingType: 'HANDLE', shelfQuantity: 1 } as never]
    });
    const withCountertop = parse(buildOfferFloorPlan(floorPlanInput()).svg);
    store.updateWall('wall-1', { countertopConfig: { ...store.walls()[0].countertopConfig!, enabled: false } });
    const withoutCountertop = parse(buildOfferFloorPlan(floorPlanInput({ walls: store.walls() })).svg);

    expect(withCountertop.querySelectorAll('[fill="#f1f5f9"]').length).toBe(1);
    expect(withoutCountertop.querySelectorAll('[fill="#f1f5f9"]').length).toBe(0);
  });
});
