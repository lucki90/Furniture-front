import { Injectable, inject } from '@angular/core';
import { ProjectRequestBuilderService } from './project-request-builder.service';
import { KitchenCabinetType } from '../cabinet-form/model/kitchen-cabinet-type';
import {
  KitchenCabinet,
  KitchenCabinetBase,
  CabinetCalculationResult,
  CabinetFormData
} from '../model/kitchen-state.model';
import { CabinetPlacementResponse } from '../model/kitchen-project.model';
import { SegmentFormData, SegmentRequest } from '../cabinet-form/model/segment.model';
import { CornerMechanismType } from '../cabinet-form/model/corner-cabinet.model';
import { OpeningType } from '../cabinet-form/model/kitchen-cabinet-constants';
import { CabinetResponse } from '../cabinet-form/model/kitchen-cabinet-form.model';

@Injectable({
  providedIn: 'root'
})
export class KitchenCabinetStateFactory {
  private requestBuilder = inject(ProjectRequestBuilderService);

  fromFormData(formData: CabinetFormData, id: string, calculatedResult: CabinetResponse): KitchenCabinet {
    const base: KitchenCabinetBase = {
      id,
      name: formData.name,
      openingType: formData.openingType,
      width: formData.width,
      height: formData.height,
      depth: formData.depth,
      positionY: formData.positionY ?? 0,
      shelfQuantity: formData.shelfQuantity,
      positioningMode: formData.positioningMode,
      gapFromCountertopMm: formData.gapFromCountertopMm,
      leftEnclosureType: formData.leftEnclosureType,
      rightEnclosureType: formData.rightEnclosureType,
      leftSupportPlate: formData.leftSupportPlate,
      rightSupportPlate: formData.rightSupportPlate,
      distanceFromWallMm: formData.distanceFromWallMm,
      leftFillerWidthOverrideMm: formData.leftFillerWidthOverrideMm,
      rightFillerWidthOverrideMm: formData.rightFillerWidthOverrideMm,
      bottomWreathOnFloor: formData.bottomWreathOnFloor ?? false,
      calculatedResult: this.requestBuilder.mapCalculationResult(calculatedResult)
    };

    switch (formData.kitchenCabinetType) {
      case KitchenCabinetType.BASE_ONE_DOOR:
        return { ...base, type: KitchenCabinetType.BASE_ONE_DOOR };
      case KitchenCabinetType.BASE_TWO_DOOR:
        return { ...base, type: KitchenCabinetType.BASE_TWO_DOOR };
      case KitchenCabinetType.BASE_WITH_DRAWERS:
        return {
          ...base,
          type: KitchenCabinetType.BASE_WITH_DRAWERS,
          drawerQuantity: formData.drawerQuantity ?? 3,
          drawerModel: formData.drawerModel ?? 'ANTARO_TANDEMBOX'
        };
      case KitchenCabinetType.BASE_SINK:
        return {
          ...base,
          type: KitchenCabinetType.BASE_SINK,
          sinkFrontType: formData.sinkFrontType ?? 'ONE_DOOR',
          sinkApronEnabled: formData.sinkApronEnabled ?? true,
          sinkApronHeightMm: formData.sinkApronHeightMm ?? 150,
          sinkDrawerModel: formData.sinkDrawerModel
        };
      case KitchenCabinetType.BASE_COOKTOP:
        return {
          ...base,
          type: KitchenCabinetType.BASE_COOKTOP,
          cooktopType: formData.cooktopType ?? 'INDUCTION',
          cooktopFrontType: formData.cooktopFrontType ?? 'DRAWERS',
          drawerQuantity: formData.drawerQuantity,
          drawerModel: formData.drawerModel ?? undefined
        };
      case KitchenCabinetType.BASE_DISHWASHER:
        return { ...base, type: KitchenCabinetType.BASE_DISHWASHER };
      case KitchenCabinetType.BASE_DISHWASHER_FREESTANDING:
        return { ...base, type: KitchenCabinetType.BASE_DISHWASHER_FREESTANDING };
      case KitchenCabinetType.BASE_OVEN:
        return {
          ...base,
          type: KitchenCabinetType.BASE_OVEN,
          ovenHeightType: formData.ovenHeightType ?? 'STANDARD',
          ovenLowerSectionType: formData.ovenLowerSectionType ?? 'LOW_DRAWER',
          ovenApronEnabled: formData.ovenApronEnabled ?? false,
          ovenApronHeightMm: formData.ovenApronHeightMm ?? 60,
          drawerModel: formData.drawerModel ?? undefined
        };
      case KitchenCabinetType.BASE_OVEN_FREESTANDING:
        return { ...base, type: KitchenCabinetType.BASE_OVEN_FREESTANDING };
      case KitchenCabinetType.BASE_FRIDGE:
        return {
          ...base,
          type: KitchenCabinetType.BASE_FRIDGE,
          fridgeSectionType: formData.fridgeSectionType ?? 'TWO_DOORS',
          lowerFrontHeightMm: formData.lowerFrontHeightMm ?? 713,
          segments: formData.segments
        };
      case KitchenCabinetType.BASE_FRIDGE_FREESTANDING:
        return {
          ...base,
          type: KitchenCabinetType.BASE_FRIDGE_FREESTANDING,
          fridgeFreestandingType: formData.fridgeFreestandingType ?? 'TWO_DOORS'
        };
      case KitchenCabinetType.TALL_CABINET:
        return { ...base, type: KitchenCabinetType.TALL_CABINET, segments: formData.segments };
      case KitchenCabinetType.CORNER_CABINET:
        return {
          ...base,
          width: formData.cornerWidthA ?? formData.width,
          type: KitchenCabinetType.CORNER_CABINET,
          cornerWidthA: formData.cornerWidthA ?? formData.width,
          cornerWidthB: formData.cornerWidthB,
          cornerMechanism: formData.cornerMechanism!,
          cornerShelfQuantity: formData.cornerShelfQuantity,
          isUpperCorner: formData.isUpperCorner ?? false,
          cornerOpeningType: formData.cornerOpeningType,
          cornerFrontUchylnyWidthMm: formData.cornerFrontUchylnyWidthMm
        };
      case KitchenCabinetType.UPPER_ONE_DOOR:
        return {
          ...base,
          type: KitchenCabinetType.UPPER_ONE_DOOR,
          isLiftUp: formData.isLiftUp ?? false,
          isFrontExtended: formData.isFrontExtended ?? false
        };
      case KitchenCabinetType.UPPER_TWO_DOOR:
        return {
          ...base,
          type: KitchenCabinetType.UPPER_TWO_DOOR,
          isLiftUp: formData.isLiftUp ?? false,
          isFrontExtended: formData.isFrontExtended ?? false
        };
      case KitchenCabinetType.UPPER_OPEN_SHELF:
        return { ...base, type: KitchenCabinetType.UPPER_OPEN_SHELF };
      case KitchenCabinetType.UPPER_CASCADE:
        return {
          ...base,
          type: KitchenCabinetType.UPPER_CASCADE,
          cascadeLowerHeight: formData.cascadeLowerHeight ?? 400,
          cascadeLowerDepth: formData.cascadeLowerDepth ?? 400,
          cascadeUpperHeight: formData.cascadeUpperHeight ?? 320,
          cascadeUpperDepth: formData.cascadeUpperDepth ?? 300,
          cascadeLowerIsLiftUp: formData.cascadeLowerIsLiftUp ?? false,
          cascadeLowerIsFrontExtended: formData.cascadeLowerIsFrontExtended ?? false,
          cascadeUpperIsLiftUp: formData.cascadeUpperIsLiftUp ?? false
        };
      case KitchenCabinetType.UPPER_HOOD:
        return {
          ...base,
          type: KitchenCabinetType.UPPER_HOOD,
          hoodFrontType: formData.hoodFrontType ?? 'FLAP',
          hoodScreenEnabled: formData.hoodScreenEnabled ?? false,
          hoodScreenHeightMm: formData.hoodScreenHeightMm ?? 100
        };
      case KitchenCabinetType.UPPER_DRAINER:
        return {
          ...base,
          type: KitchenCabinetType.UPPER_DRAINER,
          drainerFrontType: formData.drainerFrontType ?? 'OPEN'
        };
      default: {
        const exhaustive: never = formData.kitchenCabinetType;
        throw new Error(`Nieobslugiwany typ szafki: ${exhaustive}`);
      }
    }
  }

  // TODO(CODEX): Ten factory nadal musi zgadywac brakujace pola type-specific, bo backend nie persystuje wszystkich ustawien szafek. To oznacza, ze po loadProject czesc konfiguracji wraca jako frontendowe fallbacki zamiast wiernych danych z zapisu.
  fromPlacementResponse(cabResp: CabinetPlacementResponse, fallbackId: string): KitchenCabinet {
    const effectiveWidth = cabResp.cabinetType === KitchenCabinetType.CORNER_CABINET && cabResp.cornerWidthA
      ? cabResp.cornerWidthA
      : cabResp.widthMm;

    const segments = cabResp.segments?.length
      ? cabResp.segments.map((seg: SegmentRequest) => this.requestBuilder.mapSegmentResponseToFormData(seg))
      : undefined;

    const baseFromResp: KitchenCabinetBase = {
      id: cabResp.cabinetId || fallbackId,
      name: cabResp.cabinetId,
      openingType: (cabResp.openingType ?? 'LEFT') as OpeningType,
      width: effectiveWidth,
      height: cabResp.heightMm,
      depth: cabResp.depthMm,
      positionY: cabResp.positionY ?? 0,
      shelfQuantity: cabResp.shelfQuantity ?? 1,
      positioningMode: cabResp.positioningMode,
      gapFromCountertopMm: cabResp.gapFromCountertopMm,
      leftEnclosureType: cabResp.leftEnclosure?.type,
      rightEnclosureType: cabResp.rightEnclosure?.type,
      leftSupportPlate: cabResp.leftEnclosure?.supportPlate,
      rightSupportPlate: cabResp.rightEnclosure?.supportPlate,
      leftFillerWidthOverrideMm: cabResp.leftEnclosure?.fillerWidthOverrideMm,
      rightFillerWidthOverrideMm: cabResp.rightEnclosure?.fillerWidthOverrideMm,
      distanceFromWallMm: cabResp.distanceFromWallMm,
      bottomWreathOnFloor: cabResp.bottomWreathOnFloor ?? false,
      calculatedResult: this.mapPlacementCalculationResult(cabResp)
    };

    switch (cabResp.cabinetType) {
      case KitchenCabinetType.BASE_ONE_DOOR:
        return { ...baseFromResp, type: KitchenCabinetType.BASE_ONE_DOOR };
      case KitchenCabinetType.BASE_TWO_DOOR:
        return { ...baseFromResp, type: KitchenCabinetType.BASE_TWO_DOOR };
      case KitchenCabinetType.BASE_WITH_DRAWERS:
        return {
          ...baseFromResp,
          type: KitchenCabinetType.BASE_WITH_DRAWERS,
          drawerQuantity: cabResp.drawerQuantity ?? 3,
          drawerModel: cabResp.drawerModel ?? 'ANTARO_TANDEMBOX'
        };
      case KitchenCabinetType.BASE_SINK:
        return {
          ...baseFromResp,
          type: KitchenCabinetType.BASE_SINK,
          sinkFrontType: cabResp.sinkFrontType ?? 'ONE_DOOR',
          sinkApronEnabled: cabResp.sinkApronEnabled ?? true,
          sinkApronHeightMm: cabResp.sinkApronHeightMm ?? 150,
          sinkDrawerModel: cabResp.drawerModel
        };
      case KitchenCabinetType.BASE_COOKTOP:
        return {
          ...baseFromResp,
          type: KitchenCabinetType.BASE_COOKTOP,
          cooktopType: cabResp.cooktopType ?? 'INDUCTION',
          cooktopFrontType: cabResp.cooktopFrontType ?? 'DRAWERS',
          drawerQuantity: cabResp.drawerQuantity,
          drawerModel: cabResp.drawerModel
        };
      case KitchenCabinetType.BASE_DISHWASHER:
        return { ...baseFromResp, type: KitchenCabinetType.BASE_DISHWASHER };
      case KitchenCabinetType.BASE_DISHWASHER_FREESTANDING:
        return { ...baseFromResp, type: KitchenCabinetType.BASE_DISHWASHER_FREESTANDING };
      case KitchenCabinetType.BASE_OVEN:
        return {
          ...baseFromResp,
          type: KitchenCabinetType.BASE_OVEN,
          ovenHeightType: cabResp.ovenHeightType ?? 'STANDARD',
          ovenLowerSectionType: cabResp.ovenLowerSectionType ?? 'LOW_DRAWER',
          ovenApronEnabled: cabResp.ovenApronEnabled ?? false,
          ovenApronHeightMm: cabResp.ovenApronHeightMm ?? 60,
          drawerModel: cabResp.drawerModel
        };
      case KitchenCabinetType.BASE_OVEN_FREESTANDING:
        return { ...baseFromResp, type: KitchenCabinetType.BASE_OVEN_FREESTANDING };
      case KitchenCabinetType.BASE_FRIDGE:
        return {
          ...baseFromResp,
          type: KitchenCabinetType.BASE_FRIDGE,
          fridgeSectionType: cabResp.fridgeSectionType ?? 'TWO_DOORS',
          lowerFrontHeightMm: cabResp.lowerFrontHeightMm ?? 713,
          segments
        };
      case KitchenCabinetType.BASE_FRIDGE_FREESTANDING:
        return {
          ...baseFromResp,
          type: KitchenCabinetType.BASE_FRIDGE_FREESTANDING,
          fridgeFreestandingType: cabResp.fridgeFreestandingType ?? 'TWO_DOORS'
        };
      case KitchenCabinetType.TALL_CABINET:
        return { ...baseFromResp, type: KitchenCabinetType.TALL_CABINET, segments };
      case KitchenCabinetType.CORNER_CABINET:
        return {
          ...baseFromResp,
          width: cabResp.cornerWidthA ?? effectiveWidth,
          type: KitchenCabinetType.CORNER_CABINET,
          cornerWidthA: cabResp.cornerWidthA ?? effectiveWidth,
          cornerWidthB: cabResp.cornerWidthB,
          cornerMechanism: (cabResp.cornerMechanism as CornerMechanismType) ?? 'FIXED_SHELVES',
          cornerShelfQuantity: cabResp.cornerShelfQuantity,
          isUpperCorner: cabResp.isUpperCorner ?? false,
          cornerOpeningType: cabResp.cornerOpeningType,
          cornerFrontUchylnyWidthMm: cabResp.cornerFrontUchylnyWidthMm
        };
      case KitchenCabinetType.UPPER_ONE_DOOR:
        return {
          ...baseFromResp,
          type: KitchenCabinetType.UPPER_ONE_DOOR,
          isLiftUp: cabResp.isLiftUp ?? false,
          isFrontExtended: cabResp.isFrontExtended ?? false
        };
      case KitchenCabinetType.UPPER_TWO_DOOR:
        return {
          ...baseFromResp,
          type: KitchenCabinetType.UPPER_TWO_DOOR,
          isLiftUp: cabResp.isLiftUp ?? false,
          isFrontExtended: cabResp.isFrontExtended ?? false
        };
      case KitchenCabinetType.UPPER_OPEN_SHELF:
        return { ...baseFromResp, type: KitchenCabinetType.UPPER_OPEN_SHELF };
      case KitchenCabinetType.UPPER_CASCADE: {
        const lower = cabResp.cascadeSegments?.find(segment => segment.orderIndex === 0);
        const upper = cabResp.cascadeSegments?.find(segment => segment.orderIndex === 1);
        return {
          ...baseFromResp,
          type: KitchenCabinetType.UPPER_CASCADE,
          cascadeLowerHeight: lower?.height ?? 400,
          cascadeLowerDepth: lower?.depth ?? 400,
          cascadeUpperHeight: upper?.height ?? 320,
          cascadeUpperDepth: upper?.depth ?? 300,
          cascadeLowerIsLiftUp: lower?.isLiftUp ?? false,
          cascadeLowerIsFrontExtended: lower?.isFrontExtended ?? false,
          cascadeUpperIsLiftUp: upper?.isLiftUp ?? false
        };
      }
      case KitchenCabinetType.UPPER_HOOD:
        return {
          ...baseFromResp,
          type: KitchenCabinetType.UPPER_HOOD,
          hoodFrontType: cabResp.hoodFrontType ?? 'FLAP',
          hoodScreenEnabled: cabResp.hoodScreenEnabled ?? false,
          hoodScreenHeightMm: cabResp.hoodScreenHeightMm ?? 100
        };
      case KitchenCabinetType.UPPER_DRAINER:
        return {
          ...baseFromResp,
          type: KitchenCabinetType.UPPER_DRAINER,
          drainerFrontType: cabResp.drainerFrontType ?? 'OPEN'
        };
      default:
        return { ...baseFromResp, type: cabResp.cabinetType } as KitchenCabinet;
    }
  }

  private mapPlacementCalculationResult(cabResp: CabinetPlacementResponse): CabinetCalculationResult {
    return {
      totalCost: cabResp.totalCost,
      boardCosts: cabResp.boardsCost,
      componentCosts: cabResp.componentsCost,
      jobCosts: cabResp.jobsCost
    };
  }
}
