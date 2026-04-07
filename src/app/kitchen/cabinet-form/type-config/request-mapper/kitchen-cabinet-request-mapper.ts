export interface MaterialDefaults {
  boxMaterial: string;
  boxBoardThickness: number;
  boxColor: string;
  frontMaterial: string;
  frontBoardThickness: number;
  frontColor: string;
  backMaterial: string;
  backBoardThickness: number;
  /** Whether fronts are varnished by default (no edge veneer calculated). */
  varnishedFront: boolean;
}

export const DEFAULT_MATERIAL_DEFAULTS: MaterialDefaults = {
  boxMaterial: 'CHIPBOARD',
  boxBoardThickness: 18,
  boxColor: 'WHITE',
  frontMaterial: 'CHIPBOARD',
  frontBoardThickness: 18,
  frontColor: 'WHITE',
  backMaterial: 'HDF',
  backBoardThickness: 3,
  varnishedFront: false
};

export interface KitchenCabinetRequestMapper {
  map(formValue: any, materialDefaults: MaterialDefaults): any;
}
