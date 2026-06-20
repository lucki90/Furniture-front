import { Injectable, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { LanguageService } from '../../service/language.service';
import { CABINET_FORM_MESSAGES } from './cabinet-form-validation-messages';
import { KitchenCabinetType } from './model/kitchen-cabinet-type';
import { BaseFridgeCabinetValidator } from './types/base-fridge/base-fridge-cabinet-validator';
import { TallCabinetValidator } from './types/tall-cabinet/tall-cabinet-validator';

@Injectable({ providedIn: 'root' })
export class CabinetSegmentValidationService {
  private readonly languageService = inject(LanguageService);
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
    const msg = CABINET_FORM_MESSAGES[this.languageService.lang()];

    if (type === KitchenCabinetType.BASE_FRIDGE) {
      return this.baseFridgeValidator.getUpperSectionsError(form, msg);
    }

    if (type === KitchenCabinetType.TALL_CABINET) {
      return this.tallCabinetValidator.getSegmentsHeightError(form, msg);
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
