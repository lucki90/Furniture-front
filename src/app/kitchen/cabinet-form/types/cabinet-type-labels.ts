import { KitchenCabinetType } from '../model/kitchen-cabinet-type';

/**
 * Opisowe etykiety selektora typu w formularzu.
 * Listy szafek używają celowo krótszych nazw z `CabinetTypeNamePipe`.
 */
export const CABINET_TYPE_PICKER_LABELS: Record<KitchenCabinetType, string> = {
  [KitchenCabinetType.BASE_TWO_DOOR]:                'Dolna - 2 drzwi',
  [KitchenCabinetType.BASE_ONE_DOOR]:                'Dolna - 1 drzwi',
  [KitchenCabinetType.BASE_OPEN]:                    'Dolna - otwarta',
  [KitchenCabinetType.BASE_CARGO]:                   'Dolna - cargo',
  [KitchenCabinetType.BASE_WITH_DRAWERS]:            'Dolna - szuflady',
  [KitchenCabinetType.BASE_SINK]:                    'Dolna - zlewowa',
  [KitchenCabinetType.BASE_COOKTOP]:                 'Dolna - pod płytę grzewczą',
  [KitchenCabinetType.BASE_DISHWASHER]:              'Dolna - zmywarka (front)',
  [KitchenCabinetType.BASE_DISHWASHER_FREESTANDING]: 'Dolna - zmywarka wolnostojąca',
  [KitchenCabinetType.BASE_OVEN]:                    'Dolna - piekarnik (zabudowany)',
  [KitchenCabinetType.BASE_OVEN_FREESTANDING]:       'Dolna - piekarnik wolnostojący',
  [KitchenCabinetType.BASE_FRIDGE]:                  'Słupek - lodówka w zabudowie',
  [KitchenCabinetType.BASE_FRIDGE_FREESTANDING]:     'Dolna - lodówka wolnostojąca',
  [KitchenCabinetType.PANTRY_PASSAGE]:               'Przejście do spiżarni',
  [KitchenCabinetType.UPPER_ONE_DOOR]:               'Wisząca - 1 drzwi',
  [KitchenCabinetType.UPPER_LIFT_UP]:                'Wisząca - klapa do góry',
  [KitchenCabinetType.UPPER_TWO_DOOR]:               'Wisząca - 2 drzwi',
  [KitchenCabinetType.UPPER_OPEN_SHELF]:             'Wisząca - otwarta półka',
  [KitchenCabinetType.UPPER_CASCADE]:                'Wisząca - kaskadowa',
  [KitchenCabinetType.UPPER_HOOD]:                   'Wisząca - na okap',
  [KitchenCabinetType.UPPER_DRAINER]:                'Szafka z ociekaczem',
  [KitchenCabinetType.TALL_CABINET]:                 'Słupek',
  [KitchenCabinetType.CORNER_CABINET]:               'Narożna',
};
