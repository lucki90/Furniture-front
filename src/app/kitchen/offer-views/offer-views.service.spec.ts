import { TestBed } from '@angular/core/testing';
import { KitchenWorkspaceStore } from '../service/kitchen-workspace.store';
import { OfferViewsService } from './offer-views.service';
import { offerCabinet, seedLKitchenWithIsland } from './offer-views.test-fixtures';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';

describe('OfferViewsService — widoki poglądowe oferty z bieżącego projektu', () => {
  let store: KitchenWorkspaceStore;
  let service: OfferViewsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(KitchenWorkspaceStore);
    service = TestBed.inject(OfferViewsService);
  });

  it('projekt bez szafek nie ma widoków', () => {
    expect(service.buildDrawings()).toEqual([]);
  });

  it('rzut z góry, potem ściany w kolejności typów; ściana bez szafek pominięta, wyspa — każda strona osobno', () => {
    seedLKitchenWithIsland(store);

    expect(service.buildDrawings().map(view => view.title)).toEqual([
      'Rzut z góry',
      'Ściana główna — 3600 × 2600 mm',
      'Ściana lewa — 2400 × 2600 mm',
      'Wyspa kuchenna, strona frontowa — 2400 mm',
      'Wyspa kuchenna, strona tylna — 2400 mm'
    ]);
  });

  it('widok strony wyspy zawiera tylko jej szafki', () => {
    seedLKitchenWithIsland(store);

    const [front, back] = service.buildDrawings().slice(3);

    expect(front.drawing.svg.match(/>600</g)?.length).toBe(2);
    expect(back.drawing.svg.match(/>600</g)?.length).toBe(1);
  });

  it('wyspa z szafkami tylko z przodu ma jeden widok', () => {
    const islandId = store.addWall('ISLAND', 2400, 900, 38, 100);
    store.updateWall(islandId, {
      cabinets: [offerCabinet('island-1', KitchenCabinetType.BASE_ONE_DOOR, 600, 720, 560)]
    });

    expect(service.buildDrawings().map(view => view.title))
      .toEqual(['Rzut z góry', 'Wyspa kuchenna, strona frontowa — 2400 mm']);
  });

  it('render zamienia rysunki na obrazy PNG w Base64', async () => {
    seedLKitchenWithIsland(store);

    const views = await service.render();

    expect(views.length).toBe(5);
    expect(views[0].title).toBe('Rzut z góry');
    for (const view of views) {
      expect(view.pngBase64.startsWith('data:')).toBeFalse();
      expect(atob(view.pngBase64.slice(0, 12)).slice(1, 4)).toBe('PNG');
    }
  });
});
