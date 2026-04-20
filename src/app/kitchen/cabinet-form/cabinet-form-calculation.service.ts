import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { CabinetCalculatedEvent, CabinetFormData } from '../model/kitchen-state.model';
import { KitchenService } from '../service/kitchen.service';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { MaterialDefaults } from './type-config/request-mapper/kitchen-cabinet-request-mapper';
import { KitchenCabinetTypeConfig } from './type-config/kitchen-cabinet-type-config';

@Injectable({ providedIn: 'root' })
export class CabinetFormCalculationService {
  constructor(private readonly kitchenService: KitchenService) {}

  calculateCabinet(
    type: KitchenCabinetType,
    formData: CabinetFormData,
    materialDefaults: MaterialDefaults,
    editingCabinetId?: string
  ): Observable<CabinetCalculatedEvent> {
    const mapper = KitchenCabinetTypeConfig[type].requestMapper;
    const request = mapper.map(formData, materialDefaults);

    return this.kitchenService.calculateCabinet(request).pipe(
      map(result => ({
        formData,
        result,
        editingCabinetId
      }))
    );
  }
}
