import { supportsInsetFrontMounting } from '../cabinet-form/model/front-mounting.model';
import { BulkCabinetChange, BulkChangeReportItem } from '../model/bulk-cabinet-change.model';
import { cabinetDisplayName } from '../model/cabinet-display-name';
import { KitchenCabinet } from '../model/kitchen-state.model';

export const BULK_SKIP_REASONS = {
  noFronts: 'szafka bez frontów — rodzaj otwierania bez zmian',
  insetUnsupported: 'ten typ szafki nie obsługuje frontów wpuszczanych'
} as const;

export interface BulkChangePlan {
  /** Szafki po zmianie, do przeliczenia. */
  updates: KitchenCabinet[];
  /** Zmiany, których szafka nie obsługuje (z powodem) — także gdy inne zmiany tej szafki są stosowane. */
  skipped: BulkChangeReportItem[];
  /** Szafki, które już mają wybrane wartości. */
  unchanged: number;
}

/**
 * Zmiana stosowana do każdej szafki osobno: pole, którego szafka nie obsługuje, zostaje bez zmian i trafia do powodów;
 * szafka bez żadnej zmiany nie jest przeliczana.
 */
export function planBulkChange(cabinets: KitchenCabinet[], change: BulkCabinetChange): BulkChangePlan {
  const plan: BulkChangePlan = { updates: [], skipped: [], unchanged: 0 };

  for (const cabinet of cabinets) {
    const reasons: string[] = [];
    let updated: KitchenCabinet = cabinet;

    if (change.openingType && change.openingType !== cabinet.openingType) {
      if (cabinet.openingType === 'NONE') {
        reasons.push(BULK_SKIP_REASONS.noFronts);
      } else {
        updated = { ...updated, openingType: change.openingType };
      }
    }

    if (change.frontMountingType && change.frontMountingType !== (cabinet.frontMountingType ?? 'OVERLAY')) {
      if (change.frontMountingType === 'INSET' && !supportsInset(cabinet)) {
        reasons.push(BULK_SKIP_REASONS.insetUnsupported);
      } else {
        updated = { ...updated, frontMountingType: change.frontMountingType };
      }
    }

    updated = applyMaterial(updated, change);

    if (reasons.length > 0) {
      plan.skipped.push({ cabinetId: cabinet.id, label: cabinetDisplayName(cabinet), reasons });
    }
    if (updated !== cabinet) {
      plan.updates.push(updated);
    } else if (reasons.length === 0) {
      plan.unchanged++;
    }
  }
  return plan;
}

function applyMaterial(cabinet: KitchenCabinet, change: BulkCabinetChange): KitchenCabinet {
  const material = change.material;
  if (material.mode === 'PROJECT') {
    return cabinet.materialPresetCode
      ? { ...cabinet, materialPresetCode: null, materialRequest: undefined, varnishedFront: undefined }
      : cabinet;
  }
  if (material.mode === 'PRESET') {
    return cabinet.materialPresetCode === material.preset.code
      ? cabinet
      : {
        ...cabinet,
        materialPresetCode: material.preset.code,
        materialRequest: { ...material.preset.materialRequest },
        varnishedFront: material.preset.varnishedFront
      };
  }
  return cabinet;
}

function supportsInset(cabinet: KitchenCabinet): boolean {
  const context = cabinet as { liftMechanismType?: string; ovenLowerSectionType?: string; sinkFrontType?: string };
  return supportsInsetFrontMounting(cabinet.type, {
    liftMechanismType: context.liftMechanismType,
    ovenLowerSectionType: context.ovenLowerSectionType,
    sinkFrontType: context.sinkFrontType
  });
}
