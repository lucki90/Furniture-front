import { Board, Job } from '../cabinet-form/model/kitchen-cabinet-form.model';

/**
 * Buduje auto-uwagi dla płyty BOM (Excel / zestawienie) na podstawie jej typu i kontekstu szafki.
 * Funkcja czysta — bez zależności Angular DI, łatwa do testowania jednostkowego.
 *
 * Krawędzie obróbek pochodzą z backendu: puszki zawiasów z adnotacji frontu (`hingeCountPerPiece`,
 * `hingeEdgeLengthMm`), nut pod HDF z wysokości boku w zleceniu frezowania (`sideHeightMm`). Uwaga nie zgaduje
 * osi płyty — `sideX`/`sideY` nie mówią, która krawędź jest pionowa.
 */
export function buildBoardRemarks(
  board: Board,
  grooveForHdf: Job | undefined,
  isSinkCabinet: boolean,
  cornerMechanism: string | null = null
): string {
  const parts: string[] = [];
  const boardName = board.boardName;

  if (board.hingeCountPerPiece && board.hingeEdgeLengthMm) {
    parts.push(`Puszki zawiasów: ${board.hingeCountPerPiece} na front, wzdłuż krawędzi ${board.hingeEdgeLengthMm} mm`);
  }

  if (boardName === 'SIDE_NAME' && grooveForHdf) {
    const grooveLengthMm = jobInfoNumber(grooveForHdf, 'sideHeightMm');
    parts.push(grooveLengthMm
      ? `Frezowanie nutu pod HDF wzdłuż krawędzi ${grooveLengthMm} mm`
      : 'Frezowanie nutu pod HDF');
  }

  // Auto-uwagi specyficzne dla szafki pod zlewozmywak (BASE_SINK) — str. 41 książki Wasiak v.2.3
  if (isSinkCabinet) {
    if (boardName === 'FRONT_NAME') {
      // Górny zawias szafki pod zlew: 150mm od góry zamiast standardowych ~100mm,
      // żeby uniknąć kolizji z paskiem przednim pionowym
      parts.push('Szafka pod zlew: górna puszka zawiasu 150mm od góry (dolna 100mm od dołu)');
    }
    if (boardName === 'TOP_WREATH_NAME') {
      // Pasek przedni szafki pod zlew musi być cofnięty 3mm względem boków,
      // żeby śruby uchwytu nie kolidowały
      parts.push('Pasek przedni cofnięty 3mm względem boków (szafka pod zlew)');
    }
  }

  // Iter.5b [A2 C] — auto-uwaga dla L-shape (wieniec/półka z CNC) książka Wasiak v.2.3 str. 173
  if (isLShapeBoard(boardName) && board.lShapeCutoutLengthAMm && board.lShapeCutoutLengthBMm) {
    parts.push(`L-shape: wycięcie CNC w rogu ${board.lShapeCutoutLengthAMm}×${board.lShapeCutoutLengthBMm} mm`);
  }

  // Iter.6 (Faza 1) — auto-uwaga dla mechanizmów narożnych (Le Mans / Magic Corner), doc §13.
  // Dołączana do frontu uchylnego (CORNER_BLIND_FRONT/FRONT_NAME), gdzie najbardziej przydatna dla montera.
  if (cornerMechanism && (boardName === 'FRONT_NAME' || boardName === 'CORNER_BLIND_FRONT')) {
    const note = cornerMechanismRemark(cornerMechanism);
    if (note) {
      parts.push(note);
    }
  }

  return parts.join('; ');
}

/** Liczba z `additionalInfo` zlecenia w formacie `klucz=wartość`; `null`, gdy brak lub nie jest dodatnia. */
function jobInfoNumber(job: Job, key: string): number | null {
  const entry = job.additionalInfo?.find(info => info.startsWith(`${key}=`));
  const value = entry ? Number(entry.slice(key.length + 1)) : NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Iter.6 (Faza 1): nota producenta dla mechanizmu narożnego (doc §13). Null gdy brak ograniczeń. */
export function cornerMechanismRemark(mechanism: string): string | null {
  switch (mechanism) {
    case 'LE_MANS_I':
    case 'LE_MANS_II':
      return 'Le Mans: front 16-19 mm, min. 85 deg otwarcia';
    case 'MAGIC_CORNER_COMFORT':
      return 'Magic Corner Comfort: maks. 90 deg otwarcia, kosz przedni 10 kg, tylny 8 kg';
    case 'MAGIC_CORNER_STANDARD':
      return 'Magic Corner Standard: maks. 75 deg otwarcia, kosz przedni 7 kg, tylny 9 kg';
    default:
      return null;
  }
}

/** Iter.5b: czy płyta jest L-shape (wieniec/półka narożna z CNC). */
export function isLShapeBoard(boardName: string): boolean {
  return boardName === 'WREATH_L_SHAPE'
    || boardName === 'TOP_WREATH_L_SHAPE'
    || boardName === 'SHELF_L_SHAPE';
}
