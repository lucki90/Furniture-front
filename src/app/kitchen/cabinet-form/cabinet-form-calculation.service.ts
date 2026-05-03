import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { CabinetCalculatedEvent, CabinetFormData } from '../model/kitchen-state.model';
import { KitchenService } from '../service/kitchen.service';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { MaterialDefaults } from './type-config/request-mapper/kitchen-cabinet-request-mapper';
import { KitchenCabinetTypeConfig } from './type-config/kitchen-cabinet-type-config';
import { KitchenStateService } from '../service/kitchen-state.service';

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
    editingCabinetId?: string
  ): Observable<CabinetCalculatedEvent> {
    const mapper = KitchenCabinetTypeConfig[type].requestMapper;
    const request = mapper.map(formData, materialDefaults);
    // PANTRY_PASSAGE inherits attached plinth dimensions from the active wall/project plinth.
    // The static request mapper intentionally leaves these fields empty and we enrich the preview request here,
    // where KitchenStateService is available.
    const enrichedRequest = type === KitchenCabinetType.PANTRY_PASSAGE
      ? this.attachPantryPassagePlinth(request)
      : request;

    return this.kitchenService.calculateCabinet(enrichedRequest).pipe(
      map(result => ({
        formData,
        result,
        editingCabinetId
      }))
    );
  }

  private attachPantryPassagePlinth(request: Record<string, unknown>): Record<string, unknown> {
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
