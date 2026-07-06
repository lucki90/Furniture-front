import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MaterialRequest } from '../model/kitchen-project.model';
import { MaterialDefaults } from '../cabinet-form/type-config/request-mapper/kitchen-cabinet-request-mapper';

export interface MaterialPresetResponse {
  code: string;
  translationKey: string;
  descriptionTranslationKey?: string;
  defaultPreset: boolean;
  sortOrder: number;
  varnishedFront: boolean;
  materialRequest: MaterialRequest;
  backMaterial: string;
  backBoardThickness: number;
  backColor: string;
}

@Injectable({ providedIn: 'root' })
export class MaterialPresetService {
  private readonly apiUrl = `${environment.apiUrl}/material-presets`;

  constructor(private readonly http: HttpClient) {}

  listActive(): Observable<MaterialPresetResponse[]> {
    return this.http.get<MaterialPresetResponse[]>(this.apiUrl);
  }
}

export function presetToMaterialDefaults(preset: MaterialPresetResponse): MaterialDefaults {
  return {
    boxMaterial: preset.materialRequest.boxMaterial,
    boxBoardThickness: preset.materialRequest.boxBoardThickness,
    boxColor: preset.materialRequest.boxColor,
    frontMaterial: preset.materialRequest.frontMaterial,
    frontBoardThickness: preset.materialRequest.frontBoardThickness,
    frontColor: preset.materialRequest.frontColor,
    backMaterial: preset.backMaterial,
    backBoardThickness: preset.backBoardThickness,
    varnishedFront: preset.varnishedFront
  };
}
