import { DEFAULT_COUNTERTOP_REQUEST } from '../../model/countertop.model';
import { CountertopConfig, WallWithCabinets } from '../../model/kitchen-state.model';
import { CORNER_ISSUE_CODES, CornerIssue, WallTopology } from './corner-layout.model';
import { countertopDepthMm, CountertopCornerJoint } from './corner-run-trims';

/**
 * Ostrzeżenia połączeń blatów w narożnikach, w których blaty się łączą: różny materiał, grubość albo kolor blatów
 * oraz cięcie 45° przy różnych głębokościach. Spójne z backendem: `CountertopJointValidator`.
 */
export function detectCountertopJointIssues(
  joints: readonly CountertopCornerJoint[],
  topology: WallTopology,
  walls: readonly WallWithCabinets[]
): CornerIssue[] {
  return joints.flatMap(joint => {
    const corner = topology.corners.find(candidate => candidate.id === joint.cornerId);
    const wallA = walls.find(wall => wall.id === corner?.a.wallId);
    const wallB = walls.find(wall => wall.id === corner?.b.wallId);
    if (!wallA || !wallB) {
      return [];
    }
    const issues: CornerIssue[] = [];
    if (!sameMaterial(wallA.countertopConfig, wallB.countertopConfig)) {
      issues.push({
        code: CORNER_ISSUE_CODES.COUNTERTOP_JOINT_MATERIAL_MISMATCH,
        severity: 'WARNING',
        args: { wallType1: wallA.type, wallType2: wallB.type }
      });
    }
    const depthA = countertopDepthMm(wallA);
    const depthB = countertopDepthMm(wallB);
    if (joint.type === 'MITER_45' && depthA !== depthB) {
      issues.push({
        code: CORNER_ISSUE_CODES.COUNTERTOP_JOINT_DEPTH_MISMATCH,
        severity: 'WARNING',
        args: { wallType1: wallA.type, depthMm1: String(depthA), wallType2: wallB.type, depthMm2: String(depthB) }
      });
    }
    return issues;
  });
}

/** Materiał, grubość i kolor jak w requeście do backendu (`ProjectWallAddonsRequestBuilder`). */
function sameMaterial(a: CountertopConfig | undefined, b: CountertopConfig | undefined): boolean {
  return (a?.materialType ?? DEFAULT_COUNTERTOP_REQUEST.materialType) === (b?.materialType ?? DEFAULT_COUNTERTOP_REQUEST.materialType)
    && (a?.thicknessMm ?? DEFAULT_COUNTERTOP_REQUEST.thicknessMm) === (b?.thicknessMm ?? DEFAULT_COUNTERTOP_REQUEST.thicknessMm)
    && (a?.colorCode ?? null) === (b?.colorCode ?? null);
}
