import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { CabinetCalculatedEvent, CabinetFormData } from '../model/kitchen-state.model';
import { KitchenService } from '../service/kitchen.service';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { CabinetCalculateRequest, MaterialDefaults } from './type-config/request-mapper/kitchen-cabinet-request-mapper';
import { KitchenCabinetTypeConfig } from './type-config/kitchen-cabinet-type-config';
import { KitchenStateService } from '../service/kitchen-state.service';
import { MaterialRequest } from '../model/kitchen-project.model';

export interface CabinetMaterialOverride {
  materialRequest: MaterialRequest;
  varnishedFront: boolean;
  materialPresetCode?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CabinetFormCalculationService {
  constructor(
    private readonly kitchenService: KitchenService,
    private readonly stateService: KitchenStateService
  ) {}

  calculateCabinet(
    type: KitchenCabinetType,
    formData: CabinetFormData,
    materialDefaults: MaterialDefaults,
    editingCabinetId?: string,
    materialOverride?: CabinetMaterialOverride,
    preservePersistedMaterial = true
  ): Observable<CabinetCalculatedEvent> {
    const mapper = KitchenCabinetTypeConfig[type].requestMapper;
    const mappedRequest = mapper.map(formData, materialDefaults);
    const request = materialOverride
      ? this.applyMaterialOverride(mappedRequest, materialOverride)
      : preservePersistedMaterial
        ? this.applyPersistedCabinetMaterial(mappedRequest, editingCabinetId)
        : mappedRequest;
    // PANTRY_PASSAGE inherits attached plinth dimensions from the active wall/project plinth.
    // The static request mapper intentionally leaves these fields empty and we enrich the preview request here,
    // where KitchenStateService is available.
    const enrichedRequest = type === KitchenCabinetType.PANTRY_PASSAGE
      ? this.attachPantryPassagePlinth(request)
      : request;

    return this.kitchenService.calculateCabinet(enrichedRequest).pipe(
      map(result => ({
        formData: {
          ...formData,
          materialRequest: { ...enrichedRequest.materialRequest },
          varnishedFront: enrichedRequest.varnishedFront,
          materialPresetCode: materialOverride?.materialPresetCode ?? formData.materialPresetCode ?? null
        },
        result,
        editingCabinetId
      }))
    );
  }

  private applyMaterialOverride(
    request: CabinetCalculateRequest,
    materialOverride: CabinetMaterialOverride
  ): CabinetCalculateRequest {
    return {
      ...request,
      materialRequest: { ...materialOverride.materialRequest },
      varnishedFront: materialOverride.varnishedFront
    };
  }

  private applyPersistedCabinetMaterial(
    request: CabinetCalculateRequest,
    editingCabinetId?: string
  ): CabinetCalculateRequest {
    if (!editingCabinetId) {
      return request;
    }

    const existingCabinet = this.stateService.getCabinetById(editingCabinetId);
    if (!existingCabinet?.materialRequest && existingCabinet?.varnishedFront === undefined) {
      return request;
    }

    return {
      ...request,
      materialRequest: existingCabinet.materialRequest
        ? { ...existingCabinet.materialRequest }
        : request.materialRequest,
      varnishedFront: existingCabinet.varnishedFront ?? request.varnishedFront
    };
  }

  private attachPantryPassagePlinth(request: CabinetCalculateRequest): CabinetCalculateRequest {
    const wallPlinth = this.stateService.getPlinthConfig(this.stateService.selectedWall()?.id ?? '');
    if (wallPlinth?.enabled === false) {
      return {
        ...request,
        attachedPlinthHeightMm: 0,
        attachedPlinthSetbackMm: 0
      };
    }

    return {
      ...request,
      attachedPlinthHeightMm: wallPlinth?.heightMm ?? this.stateService.plinthHeightMm(),
      attachedPlinthSetbackMm: wallPlinth?.setbackMm ?? this.stateService.plinthSetbackMm()
    };
  }
}
