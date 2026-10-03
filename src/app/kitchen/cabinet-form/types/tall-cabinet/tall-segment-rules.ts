import { SegmentFormData, SegmentFrontType, SegmentType } from '../../model/segment.model';
import { tallApplianceNicheSpec } from './tall-appliance-niche';
import { buildTallSegmentLayout } from './tall-segment-layout';

/** Grubość płyty korpusu słupka (jak `TallCabinetKitchenCabinetPreparer.BOX_BOARD_THICKNESS_MM`). */
export const TALL_BOX_BOARD_THICKNESS_MM = 18;
/** Najszersze pojedyncze drzwi segmentu; szerszy słupek wymaga dwojga drzwi. */
export const TALL_SINGLE_DOOR_WIDTH_MAX_MM = 600;
const FOLDING_LIFT_MECHANISMS = new Set(['AVENTOS_HF_TOP']);

/** Uwaga do segmentu: kod jak w backendzie i komunikat po polsku. */
export interface TallSegmentIssue {
  segmentIndex: number;
  code: string;
  message: string;
}

/**
 * Wczesna informacja o segmentach słupka — lustro reguł `TallCabinetKitchenCabinetValidator`: światło wnęk AGD,
 * szerokość pojedynczych drzwi i klapa tylko w najwyższym segmencie. Backend pozostaje źródłem prawdy.
 */
export function tallSegmentIssues(
  cabinetWidthMm: number,
  segments: readonly SegmentFormData[] | null | undefined,
  boardThicknessMm = TALL_BOX_BOARD_THICKNESS_MM
): TallSegmentIssue[] {
  const list = segments ?? [];
  const layout = buildTallSegmentLayout(list, boardThicknessMm);
  const openingWidth = (Number(cabinetWidthMm) || 0) - 2 * boardThicknessMm;
  const issues: TallSegmentIssue[] = [];

  layout.slots.forEach(slot => {
    const segment = list[slot.index];
    const number = slot.index + 1;
    const add = (code: string, message: string) => issues.push({ segmentIndex: slot.index, code, message });

    if (segment.segmentType === SegmentType.DOOR) {
      const frontType = segment.frontType ?? SegmentFrontType.ONE_DOOR;
      if (frontType === SegmentFrontType.ONE_DOOR && cabinetWidthMm > TALL_SINGLE_DOOR_WIDTH_MAX_MM) {
        add('ex.segment.door.too.wide', `Segment ${number}: pojedyncze drzwi w słupku o szerokości ${cabinetWidthMm} mm `
          + `są za szerokie (maks. ${TALL_SINGLE_DOOR_WIDTH_MAX_MM} mm) — wybierz dwoje drzwi.`);
      }
      if (frontType === SegmentFrontType.UPWARDS && slot.index > 0) {
        add('ex.segment.lift.not.top', `Segment ${number}: klapa do góry jest możliwa tylko w najwyższym segmencie.`);
      }
      if (frontType === SegmentFrontType.UPWARDS && FOLDING_LIFT_MECHANISMS.has(segment.liftMechanismType ?? '')) {
        add('ex.segment.lift.mechanism.unsupported',
          `Segment ${number}: front składany nie jest dostępny w słupku — wybierz podnośnik pojedynczej klapy.`);
      }
    }

    const spec = tallApplianceNicheSpec(segment);
    if (!spec) {
      return;
    }
    const opening = slot.openingHeightMm;
    if (opening < spec.minOpeningHeightMm) {
      add('ex.segment.appliance.niche.too.low', `Segment ${number} (${spec.label}): wnęka ma ${opening} mm w świetle, `
        + `a sprzęt wymaga co najmniej ${spec.minOpeningHeightMm} mm — zwiększ wysokość segmentu `
        + `o ${spec.minOpeningHeightMm - opening} mm.`);
    }
    if (spec.maxOpeningHeightMm !== null && opening > spec.maxOpeningHeightMm) {
      add('ex.segment.appliance.niche.too.high', `Segment ${number} (${spec.label}): wnęka ma ${opening} mm w świetle, `
        + `a sprzęt mieści się w najwyżej ${spec.maxOpeningHeightMm} mm — zmniejsz wysokość segmentu `
        + `o ${opening - spec.maxOpeningHeightMm} mm.`);
    }
    if (openingWidth < spec.minOpeningWidthMm) {
      add('ex.segment.appliance.niche.too.narrow', `Segment ${number} (${spec.label}): słupek ma ${openingWidth} mm `
        + `szerokości w świetle, a sprzęt wymaga co najmniej ${spec.minOpeningWidthMm} mm.`);
    }
    if (spec.maxOpeningWidthMm !== null && openingWidth > spec.maxOpeningWidthMm) {
      add('ex.segment.appliance.niche.too.wide', `Segment ${number} (${spec.label}): słupek ma ${openingWidth} mm `
        + `szerokości w świetle, a wnęka sprzętu może mieć najwyżej ${spec.maxOpeningWidthMm} mm.`);
    }
  });
  return issues;
}
