/**
 * Stałe definicje opcji wyboru dla formularza szafki
 */
export class CabinetConstants {
  static readonly CABINET_TYPES = [
    {value: 'STANDARD', label: 'GENERAL.cabinet.standard'},
    {value: 'INTERNAL', label: 'GENERAL.cabinet.internal'},
  ];

  static readonly OPENING_TYPES = [
    {value: 'HANDLE', label: 'OpeningModelEnum.HANDLE'},
    {value: 'CLICK', label: 'OpeningModelEnum.CLICK'},
    {value: 'MILLED', label: 'OpeningModelEnum.MILLED'},
    {value: 'NONE', label: 'OpeningModelEnum.NONE'},
  ];

  static readonly FRONT_TYPES = [
    {value: 'OPEN', label: 'alone-cabin.front.open'},
    {value: 'ONE_DOOR', label: 'alone-cabin.front.oneDoor'},
    {value: 'TWO_DOORS', label: 'alone-cabin.front.twoDoors'},
    {value: 'UPWARDS', label: 'alone-cabin.front.upward'},
    {value: 'DRAWER', label: 'alone-cabin.front.drawer'}
  ];

  static readonly MATERIALS = [
    {value: 'CHIPBOARD', label: 'GENERAL.material.CHIPBOARD'},
    {value: 'MDF', label: 'GENERAL.material.MDF'}
  ];

  static readonly THICKNESSES = [
    {value: 16, label: '16'},
    {value: 18, label: '18'},
    {value: 20, label: '20'}
  ];

  static readonly COLORS = [
    {value: 'white', label: 'GENERAL.color.white'},
    {value: 'black', label: 'GENERAL.color.black'},
    {value: 'red', label: 'GENERAL.color.red'}
  ];

  static readonly TRANSLATION_PREFIXES = [
    'ERROR',
    'alone-cabin',
    'GENERAL',
    'VeneerModelEnum',
    'ComponentCategoryEnum',
    'JobCategoryEnum',
    'BoardNameEnum',
    'CuttingTypeEnum',
    'ShelfSupportModelEnum',
    'HangerModelEnum',
    'HingeTypeEnum',
    'FeetModelEnum',
    'OpeningModelEnum',
    'MillingTypeEnum'
  ];
}
