import { Pipe, PipeTransform } from '@angular/core';
import { KitchenCabinetType } from '../model/kitchen-cabinet-type';

const CABINET_TYPE_LABELS: Record<KitchenCabinetType, string> = {
  [KitchenCabinetType.BASE_ONE_DOOR]: 'Dolna 1-drzwiowa',
  [KitchenCabinetType.BASE_TWO_DOOR]: 'Dolna 2-drzwiowa',
  [KitchenCabinetType.BASE_WITH_DRAWERS]: 'Dolna z szufladami',
  [KitchenCabinetType.TALL_CABINET]: 'Słupek',
  [KitchenCabinetType.CORNER_CABINET]: 'Narożna',
  [KitchenCabinetType.UPPER_ONE_DOOR]: 'Wisząca 1-drzwiowa',
  [KitchenCabinetType.UPPER_TWO_DOOR]: 'Wisząca 2-drzwiowa',
  [KitchenCabinetType.UPPER_OPEN_SHELF]: 'Wisząca otwarta',
  [KitchenCabinetType.UPPER_CASCADE]: 'Wisząca kaskadowa',
  [KitchenCabinetType.UPPER_HOOD]: 'Na okap',
  [KitchenCabinetType.BASE_SINK]: 'Zlewowa',
  [KitchenCabinetType.BASE_COOKTOP]: 'Pod płytę grzewczą',
  [KitchenCabinetType.BASE_DISHWASHER]: 'Zmywarka (front)',
  [KitchenCabinetType.BASE_DISHWASHER_FREESTANDING]: 'Zmywarka wolnostojąca',
  [KitchenCabinetType.BASE_OVEN]: 'Piekarnik (szafka)',
  [KitchenCabinetType.BASE_OVEN_FREESTANDING]: 'Piekarnik wolnostojący',
  [KitchenCabinetType.BASE_FRIDGE]: 'Szafka na lodówkę',
  [KitchenCabinetType.BASE_FRIDGE_FREESTANDING]: 'Lodówka wolnostojąca',
  [KitchenCabinetType.UPPER_DRAINER]: 'Szafka z ociekaczem'
};

/**
 * Pure pipe — zwraca polską nazwę typu szafki.
 * Pure = Angular memoizuje wynik per argument, nie przelicza przy każdym CD cycle.
 */
@Pipe({
  name: 'cabinetTypeName',
  standalone: true,
  pure: true
})
export class CabinetTypeNamePipe implements PipeTransform {
  transform(type: KitchenCabinetType): string {
    return CABINET_TYPE_LABELS[type] ?? type;
  }
}
