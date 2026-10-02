import { CornerIssue, CornerIssueCode, WallCornerConstraints, WallTopology } from './corner-layout.model';
import { cornerAt } from './wall-topology.resolver';
import { WALL_TYPES, WallType } from '../../model/kitchen-project.model';
import { WallWithCabinets } from '../../model/kitchen-state.model';

/**
 * Polskie szablony komunikatów problemów narożnika. Te same klucze trafiają do fallbacków
 * `ErrorTranslationService`, więc komunikat z frontu i z backendu (Etap 3) brzmi tak samo.
 */
export const CORNER_ISSUE_MESSAGES_PL: Record<CornerIssueCode, string> = {
  'ex.cabinets.overlap.cross.wall':
    'Szafka {{cabinetId1}} ({{wallType1}}) koliduje w narożniku z szafką {{cabinetId2}} ({{wallType2}}).',
  'ex.corner.cabinet.duplicate':
    'W jednym narożniku stoją dwie szafki narożne: {{cabinetId1}} ({{wallType1}}) i {{cabinetId2}} ({{wallType2}}).',
  'warning.corner.cabinet.not.at.corner':
    'Szafka narożna {{cabinetId}} ({{wallType}}) stoi {{offsetMm}} mm od końca ściany, a nie w narożniku.',
  'warning.corner.blind.part.too.short':
    'Ślepa część szafki {{cabinetId}} ({{wallType}}) ma {{actualMm}} mm, a potrzeba co najmniej {{requiredMm}} mm, '
    + 'żeby front otwierany nie zachodził za szafkę sąsiedniej ściany.',
  'warning.corner.blind.uncovered':
    'Przed ślepą częścią szafki {{cabinetId}} ({{wallType}}) nie stoi szafka sąsiedniej ściany — front ślepy będzie odsłonięty.',
  'warning.corner.front.blocked':
    'Front szafki {{cabinetId}} ({{wallType}}) zasłania szafka {{blockingCabinetId}} ({{blockingWallType}}) — '
    + 'w narożniku rozważ szafkę narożną.',
  'warning.corner.clearance.too.small':
    'Szafka {{cabinetId}} ({{wallType}}) stoi {{actualMm}} mm od narożnika, a z blendą narożną potrzeba {{requiredMm}} mm.',
  'warning.corner.handedness.mismatch':
    'Front otwierany szafki {{cabinetId}} ({{wallType}}) jest po stronie {{actual}}, a przy tym narożniku powinien być '
    + 'po stronie {{expected}}.',
  'warning.countertop.joint.material.mismatch':
    'Blaty łączone w narożniku ({{wallType1}} i {{wallType2}}) różnią się materiałem, grubością albo kolorem.',
  'warning.countertop.joint.depth.mismatch':
    'Cięcie 45° łączy blaty o różnej głębokości: {{wallType1}} {{depthMm1}} mm i {{wallType2}} {{depthMm2}} mm — '
    + 'przekątna nie trafi w narożnik frontów.'
};

/** Czytelne nazwy szafek i ścian używane w komunikatach. */
export interface CornerIssueLabels {
  cabinetLabel(cabinetId: string): string;
  wallLabel(wallType: WallType): string;
}

const CABINET_ARGS = ['cabinetId', 'cabinetId1', 'cabinetId2', 'blockingCabinetId'];
const WALL_ARGS = ['wallType', 'wallType1', 'wallType2', 'blockingWallType'];
const SIDE_LABELS: Record<string, string> = { LEFT: 'lewej', RIGHT: 'prawej' };

/**
 * Argumenty komunikatu narożnika z backendu z czytelnymi nazwami ścian i stron (backend wysyła typy, np. `MAIN`).
 * Dla innych kodów zwraca argumenty bez zmian.
 */
export function localizeCornerIssueArgs(code: string, args: Record<string, string>): Record<string, string> {
  if (!(code in CORNER_ISSUE_MESSAGES_PL)) {
    return args;
  }
  const localized: Record<string, string> = { ...args };
  for (const key of WALL_ARGS) {
    if (localized[key]) {
      localized[key] = WALL_TYPES.find(wallType => wallType.value === localized[key])?.label ?? localized[key];
    }
  }
  for (const key of ['expected', 'actual']) {
    if (localized[key]) {
      localized[key] = SIDE_LABELS[localized[key]] ?? localized[key];
    }
  }
  return localized;
}

/** Identyfikatory szafek, których dotyczy problem. */
export function cornerIssueCabinetIds(issue: CornerIssue): string[] {
  return CABINET_ARGS.map(key => issue.args[key]).filter((id): id is string => !!id);
}

/**
 * Czy problem dotyczy ściany: przez jej szafki, a problem bez szafek (np. połączenie blatów) — przez typ ściany
 * w argumentach.
 */
export function cornerIssueConcernsWall(issue: CornerIssue, wall: Pick<WallWithCabinets, 'type' | 'cabinets'>): boolean {
  const cabinetIds = cornerIssueCabinetIds(issue);
  if (cabinetIds.length > 0) {
    return wall.cabinets.some(cabinet => cabinetIds.includes(cabinet.id));
  }
  return WALL_ARGS.some(key => issue.args[key] === wall.type);
}

/** Komunikat problemu z czytelnymi nazwami szafek, ścian i stron. */
export function formatCornerIssueMessage(issue: CornerIssue, labels: CornerIssueLabels): string {
  const args: Record<string, string> = { ...issue.args };
  for (const key of CABINET_ARGS) {
    if (args[key]) {
      args[key] = labels.cabinetLabel(args[key]);
    }
  }
  for (const key of WALL_ARGS) {
    if (args[key]) {
      args[key] = labels.wallLabel(args[key] as WallType);
    }
  }
  for (const key of ['expected', 'actual']) {
    if (args[key]) {
      args[key] = SIDE_LABELS[args[key]] ?? args[key];
    }
  }
  return CORNER_ISSUE_MESSAGES_PL[issue.code].replace(/\{\{(\w+)\}\}/g, (match, key: string) => args[key] ?? match);
}

/**
 * Opis stref narożnych ściany: który koniec zajmują szafki sąsiedniej ściany i na jakiej długości.
 */
export function buildCornerZoneNotes(
  wall: WallWithCabinets,
  constraints: WallCornerConstraints | undefined,
  topology: WallTopology,
  wallLabel: (wallType: WallType) => string
): string[] {
  if (!constraints) {
    return [];
  }
  const notes: string[] = [];
  for (const end of ['START', 'END'] as const) {
    const corner = cornerAt(topology, wall.id, end);
    const bottomMm = end === 'START' ? constraints.startBottomMm : constraints.endBottomMm;
    const topMm = end === 'START' ? constraints.startTopMm : constraints.endTopMm;
    if (!corner || (bottomMm <= 0 && topMm <= 0)) {
      continue;
    }
    const partner = corner.a.wallId === wall.id ? corner.b : corner.a;
    const parts = [
      bottomMm > 0 ? `${bottomMm} mm w strefie dolnej` : null,
      topMm > 0 ? `${topMm} mm w strefie górnej` : null
    ].filter((part): part is string => part !== null);
    const side = end === 'START' ? 'Lewy koniec ściany' : 'Prawy koniec ściany';
    notes.push(`${side}: narożnik z „${wallLabel(partner.wallType)}” — szafki sąsiedniej ściany zajmują ${parts.join(' i ')}.`);
  }
  return notes;
}
