import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import { KitchenCabinet } from '../model/kitchen-state.model';
import { KitchenWorkspaceStore } from '../service/kitchen-workspace.store';
import { lCorner } from '../service/corner-layout/corner-layout.test-fixtures';

/** Szafka do specy widoków oferty: minimalne pola wspólne i pola typu. */
export function offerCabinet(
  id: string,
  type: KitchenCabinetType,
  width: number,
  height: number,
  depth: number,
  extra: Record<string, unknown> = {}
): KitchenCabinet {
  return { id, type, width, height, depth, openingType: 'HANDLE', shelfQuantity: 1, ...extra } as unknown as KitchenCabinet;
}

const UPPER = { positioningMode: 'RELATIVE_TO_CEILING' };

/**
 * Kuchnia w L z wyspą: ściana główna (szafka narożna L, szuflady, zlew, zmywarka, słupek, wiszące), ściana lewa
 * (dolne i wiszące), pusta ściana prawa oraz wyspa z szafkami po obu stronach.
 */
export function seedLKitchenWithIsland(store: KitchenWorkspaceStore): void {
  store.updateWall('wall-1', {
    cabinets: [
      lCorner('main-corner', 0, 900, 900).cabinet,
      offerCabinet('main-drawers', KitchenCabinetType.BASE_WITH_DRAWERS, 600, 720, 560, { drawerQuantity: 3 }),
      offerCabinet('main-sink', KitchenCabinetType.BASE_SINK, 800, 720, 560),
      offerCabinet('main-dishwasher', KitchenCabinetType.BASE_DISHWASHER, 600, 720, 560),
      offerCabinet('main-tall', KitchenCabinetType.TALL_CABINET, 600, 2100, 560),
      offerCabinet('main-upper-1', KitchenCabinetType.UPPER_TWO_DOOR, 800, 720, 320, UPPER),
      offerCabinet('main-upper-2', KitchenCabinetType.UPPER_ONE_DOOR, 600, 720, 320, UPPER)
    ]
  });
  const leftWallId = store.addWall('LEFT', 2400, 2600, 38, 100);
  store.updateWall(leftWallId, {
    cabinets: [
      offerCabinet('left-base-1', KitchenCabinetType.BASE_TWO_DOOR, 800, 720, 560),
      offerCabinet('left-base-2', KitchenCabinetType.BASE_ONE_DOOR, 600, 720, 560),
      offerCabinet('left-upper', KitchenCabinetType.UPPER_TWO_DOOR, 800, 720, 320, UPPER)
    ]
  });
  store.addWall('RIGHT', 2000, 2600, 38, 100);
  const islandId = store.addWall('ISLAND', 2400, 900, 38, 100, { islandDepthMm: 900 });
  store.updateWall(islandId, {
    cabinets: [
      offerCabinet('island-front-1', KitchenCabinetType.BASE_WITH_DRAWERS, 600, 720, 560, { drawerQuantity: 2 }),
      offerCabinet('island-front-2', KitchenCabinetType.BASE_ONE_DOOR, 600, 720, 560),
      offerCabinet('island-back-1', KitchenCabinetType.BASE_OPEN, 600, 720, 300, { cabinetSide: 'BACK' })
    ]
  });
}
