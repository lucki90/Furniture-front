import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { BaseFridgeCabinetValidator } from './types/base-fridge/base-fridge-cabinet-validator';
import { TallCabinetValidator } from './types/tall-cabinet/tall-cabinet-validator';

@Injectable({ providedIn: 'root' })
export class CabinetSegmentValidationService {
  private readonly tallCabinetValidator = new TallCabinetValidator();
  private readonly baseFridgeValidator = new BaseFridgeCabinetValidator();

  validate(form: FormGroup, type: KitchenCabinetType): void {
    if (type === KitchenCabinetType.TALL_CABINET) {
      this.tallCabinetValidator.validate(form);
      return;
    }

    if (type === KitchenCabinetType.BASE_FRIDGE) {
      this.baseFridgeValidator.validate(form);
    }
  }

  getSegmentHeightError(form: FormGroup, type: KitchenCabinetType): string | null {
    if (type === KitchenCabinetType.BASE_FRIDGE) {
      return this.baseFridgeValidator.getUpperSectionsError(form);
    }

    if (type === KitchenCabinetType.TALL_CABINET) {
      return this.tallCabinetValidator.getSegmentsHeightError(form);
    }

    return null;
  }

  getFridgeSectionHeight(form: FormGroup): number {
    return this.baseFridgeValidator.getFridgeSectionHeight(form);
  }

  getUpperSectionsHeightSum(form: FormGroup): number {
    return this.baseFridgeValidator.getUpperSectionsHeightSum(form);
  }
}
