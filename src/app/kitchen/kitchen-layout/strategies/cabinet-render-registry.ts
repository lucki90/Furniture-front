import { KitchenCabinetType } from '../../cabinet-form/model/kitchen-cabinet-type';
import { CabinetRenderer } from './cabinet-render-context';
import { renderSingleDoor } from './renderers/single-door.renderer';
import { renderDoubleDoor } from './renderers/double-door.renderer';
import { renderDrawers } from './renderers/drawers.renderer';
import { renderOpenShelf } from './renderers/open-shelf.renderer';
import { renderTallCabinet } from './renderers/tall-cabinet.renderer';
import { renderFridgeBuiltIn } from './renderers/fridge-builtin.renderer';
import { renderFridgeFreestanding } from './renderers/fridge-freestanding.renderer';
import { renderOven } from './renderers/oven.renderer';
import { renderCascade } from './renderers/cascade.renderer';
import { renderDrainer } from './renderers/drainer.renderer';

/**
 * Rejestr strategii renderowania SVG per typ szafki.
 * Dodanie nowego typu szafki = stworzenie nowego pliku renderera + wpis tutaj.
 * Brak wpisu = brak elementów wizualnych (pusty korpus).
 */
export const CABINET_RENDER_REGISTRY: Partial<Record<KitchenCabinetType, CabinetRenderer>> = {
  // Szafki dolne — standardowe
  [KitchenCabinetType.BASE_ONE_DOOR]:                renderSingleDoor,
  [KitchenCabinetType.BASE_TWO_DOOR]:                renderDoubleDoor,
  [KitchenCabinetType.BASE_WITH_DRAWERS]:            renderDrawers,
  [KitchenCabinetType.BASE_SINK]:                    renderSingleDoor,
  [KitchenCabinetType.BASE_COOKTOP]:                 renderDrawers,
  [KitchenCabinetType.BASE_DISHWASHER]:              renderSingleDoor,

  // Wolnostojące AGD — tylko srebrny korpus, bez elementów wizualnych
  // (brak wpisu = brak renderowania → pusty srebrny prostokąt z CSS)
  // BASE_DISHWASHER_FREESTANDING: nie ma wpisu → noop
  // BASE_OVEN_FREESTANDING: nie ma wpisu → noop

  // Szafki dolne — specjalne
  [KitchenCabinetType.BASE_FRIDGE_FREESTANDING]:     renderFridgeFreestanding,
  [KitchenCabinetType.BASE_FRIDGE]:                  renderFridgeBuiltIn,
  [KitchenCabinetType.BASE_OVEN]:                    renderOven,

  // Słupek
  [KitchenCabinetType.TALL_CABINET]:                 renderTallCabinet,

  // Szafka narożna — tymczasowo uproszczona wizualizacja (TODO: kształt L)
  [KitchenCabinetType.CORNER_CABINET]:               renderSingleDoor,

  // Szafki wiszące
  [KitchenCabinetType.UPPER_ONE_DOOR]:               renderSingleDoor,
  [KitchenCabinetType.UPPER_TWO_DOOR]:               renderDoubleDoor,
  [KitchenCabinetType.UPPER_OPEN_SHELF]:             renderOpenShelf,
  [KitchenCabinetType.UPPER_CASCADE]:                renderCascade,
  [KitchenCabinetType.UPPER_HOOD]:                   renderSingleDoor,
  [KitchenCabinetType.UPPER_DRAINER]:                renderDrainer,
};
