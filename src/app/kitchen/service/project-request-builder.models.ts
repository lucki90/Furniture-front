import { MaterialDefaults } from '../cabinet-form/type-config/request-mapper/kitchen-cabinet-request-mapper';

export interface WallBuildSettings {
  plinthHeightMm: number;
  countertopThicknessMm: number;
  upperFillerHeightMm: number;
  fillerWidthMm: number;
  materialDefaults?: MaterialDefaults;
}
