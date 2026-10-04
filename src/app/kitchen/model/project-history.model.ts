/** Zdarzenie na osi czasu projektu (backend: `ProjectEventResponse`). */
export type ProjectEventType =
  | 'CREATED'
  | 'SAVED'
  | 'RESTORED'
  | 'STATUS_CHANGED'
  | 'PRICING_CHANGED'
  | 'OFFER_GENERATED';

/** Kody i liczby zdarzenia; wypełnione tylko pola dotyczące danego typu. */
export interface ProjectEventSummary {
  wallsBefore?: number;
  wallsAfter?: number;
  cabinetsBefore?: number;
  cabinetsAfter?: number;
  addedByType?: Record<string, number>;
  removedByType?: Record<string, number>;
  totalCostBefore?: number;
  totalCostAfter?: number;
  changedFields?: string[];
  statusFrom?: string;
  statusTo?: string;
  offerPrice?: number;
  sourceProjectId?: number;
  sourceVersion?: number;
  restoredFromVersion?: number;
}

export interface ProjectEvent {
  id: number;
  type: ProjectEventType;
  /** Wersja projektu w chwili zdarzenia (dla zapisów — wersja utworzona zapisem). */
  version: number;
  actorName: string | null;
  /** `yyyy-MM-dd HH:mm:ss` */
  createdAt: string;
  summary: ProjectEventSummary | null;
  /** Czy wersję z tego zdarzenia można otworzyć albo sklonować. */
  restorable: boolean;
}
