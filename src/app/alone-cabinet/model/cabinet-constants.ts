/**
 * Stałe definicje opcji wyboru dla formularza szafki
 */
export class CabinetConstants {
  //TODO docelowo pobierac z bazy
  static readonly CABINET_TYPES = [
    {value: 'STANDARD', label: 'CABINET_TYPE.STANDARD'},
    {value: 'INTERNAL', label: 'CABINET_TYPE.INTERNAL'},
  ];

  static readonly OPENING_TYPES = [
    {value: 'HANDLE', label: 'OPENING_MODEL.HANDLE'},
    {value: 'CLICK', label: 'OPENING_MODEL.CLICK'},
    {value: 'MILLED', label: 'OPENING_MODEL.MILLED'},
    {value: 'NONE', label: 'OPENING_MODEL.NONE'},
  ];

  static readonly FRONT_TYPES = [
    {value: 'OPEN', label: 'UI.frontOpen'},
    {value: 'ONE_DOOR', label: 'UI.frontOneDoor'},
    {value: 'TWO_DOORS', label: 'UI.frontTwoDoors'},
    {value: 'UPWARDS', label: 'UI.frontUpward'},
    {value: 'DRAWER', label: 'UI.frontDrawer'}
  ];

  static readonly DRAWER_MODELS = [
    {value: 'ANTARO', label: 'UI.drawerModelBlumAntaroTandembox'},
    {value: 'SEVROLL_BALL', label: 'UI.drawerModelSevrollBall'}
  ];

  static readonly MATERIALS = [
    {value: 'CHIPBOARD', label: 'MATERIAL.CHIPBOARD'},
    {value: 'MDF', label: 'MATERIAL.MDF'}
  ];

  static readonly THICKNESSES = [
    {value: 16, label: '16'},
    {value: 18, label: '18'},
    {value: 20, label: '20'}
  ];

  static readonly COLORS = [
    {value: 'white', label: 'COLOR.WHITE'},
    {value: 'black', label: 'COLOR.BLACK'},
    {value: 'red', label: 'COLOR.RED'}
  ];

  static readonly TRANSLATION_CATEGORIES = [
    'UI',
    'ERROR',
    'GENERAL',
    'BOARD_NAME',
    'COMPONENT_CATEGORY',
    'JOB_CATEGORY',
    'HINGE_TYPE',
    'HANGER_MODEL',
    'FEET_MODEL',
    'LIFT_TYPE',
    'SHELF_SUPPORT_MODEL',
    'OPENING_MODEL',
    'VENEER_MODEL',
    'CUTTING_TYPE',
    'MILLING_TYPE',
    'CABINET_TYPE',
    'COLOR',
    'MATERIAL',
    'DRAWER'
  ];
}
