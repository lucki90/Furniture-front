/**
 * TypeScript replica of the Java VeneerEdgeResolver.
 *
 * Maps (boardName, veneerX, veneerY) → Polish label describing which edges are veneered.
 * Mirrors the deterministic logic in:
 *   pl.lucki.furniture_api.domain.board.veneer.VeneerEdgeResolver
 */

const EDGE_LABELS = {
  FRONT: 'przód',
  BACK:  'tył',
  TOP:   'góra',
  BOTTOM: 'dół',
} as const;

type VeneerEdge = keyof typeof EDGE_LABELS;

/** Resolved veneer edge information for a single board. */
export interface VeneerEdgeInfo {
  /** Polish comma-separated label, e.g. "przód, góra, dół". Empty string when no veneer. */
  label: string;
  /** Total number of veneered edges (0–4). */
  count: number;
}

const NONE: VeneerEdgeInfo = { label: '', count: 0 };

function edgeInfo(edges: VeneerEdge[]): VeneerEdgeInfo {
  if (edges.length === 0) return NONE;
  return {
    label: edges.map(e => EDGE_LABELS[e]).join(', '),
    count: edges.length
  };
}

// --------------------------------------------------------------------------
// Board-specific resolvers
// --------------------------------------------------------------------------

function resolveSide(veneerX: number, veneerY: number): VeneerEdgeInfo {
  const edges: VeneerEdge[] = [];
  if (veneerX >= 1) edges.push('FRONT');
  if (veneerY >= 1) edges.push('TOP');
  if (veneerY >= 2) edges.push('BOTTOM');
  return edgeInfo(edges);
}

function resolveWreath(veneerX: number, veneerY: number): VeneerEdgeInfo {
  const edges: VeneerEdge[] = [];
  if (veneerY >= 1) edges.push('FRONT');
  if (veneerY >= 2) edges.push('BACK');
  if (veneerX >= 2) { edges.push('BOTTOM'); edges.push('TOP'); }
  return edgeInfo(edges);
}

function resolveTopWreath(veneerY: number): VeneerEdgeInfo {
  if (veneerY === 0) return NONE;
  if (veneerY === 1) return edgeInfo(['FRONT']);
  return edgeInfo(['FRONT', 'BACK']);
}

function resolveShelfLike(veneerY: number): VeneerEdgeInfo {
  return veneerY >= 1 ? edgeInfo(['FRONT']) : NONE;
}

function resolveFront(veneerX: number, veneerY: number): VeneerEdgeInfo {
  if (veneerX === 0 && veneerY === 0) return NONE;
  if (veneerX >= 2 && veneerY >= 2) return edgeInfo(['FRONT', 'BACK', 'TOP', 'BOTTOM']);
  return resolveFromCounts(veneerX, veneerY);
}

function resolveFromCounts(veneerX: number, veneerY: number): VeneerEdgeInfo {
  const total = veneerX + veneerY;
  if (total === 0) return NONE;
  if (total === 1) return edgeInfo(['FRONT']);
  if (total === 2) return edgeInfo(['FRONT', 'BOTTOM']);
  if (total === 3) return edgeInfo(['FRONT', 'BOTTOM', 'TOP']);
  return edgeInfo(['FRONT', 'BACK', 'TOP', 'BOTTOM']);
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Resolves the Polish veneer edge label for a board.
 *
 * @param boardName  The board name string (matching Java BoardNameEnum).
 * @param veneerX    Number of X-direction veneered edges (0–2).
 * @param veneerY    Number of Y-direction veneered edges (0–2).
 * @returns VeneerEdgeInfo with label and count.
 */
export function resolveVeneerEdges(boardName: string, veneerX: number, veneerY: number): VeneerEdgeInfo {
  switch (boardName) {
    case 'SIDE_NAME':
      return resolveSide(veneerX, veneerY);

    case 'WREATH_NAME':
      return resolveWreath(veneerX, veneerY);

    case 'TOP_WREATH_NAME':
      return resolveTopWreath(veneerY);

    case 'SHELF_NAME':
    case 'HOOD_SCREEN':
    case 'CORNER_PANEL':
    case 'OVEN_APRON':
    case 'SEGMENT_DIVIDER_NAME':
      return resolveShelfLike(veneerY);

    case 'FRONT_NAME':
    case 'FRONT_DRAWER_NAME':
    case 'SINK_APRON':
    case 'BLIND_PANEL':
    case 'BIFOLD_INNER_FRONT':
    case 'OVEN_TRAY_FRONT':
      return resolveFront(veneerX, veneerY);

    case 'HDF_NAME':
    case 'BASE_DRAWER_NAME':
    case 'BACK_DRAWER_NAME':
    case 'FRONT_SUPPORTER_DRAWER_NAME':
    case 'SIDE_DRAWER_NAME':
      return NONE;

    default:
      return resolveFromCounts(veneerX, veneerY);
  }
}
