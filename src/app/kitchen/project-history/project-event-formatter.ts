import { ProjectEvent, ProjectEventSummary } from '../model/project-history.model';

/** Etykiety potrzebne do opisu zdarzenia: tłumaczenia, typy szafek i statusy projektu. */
export interface ProjectEventLabels {
  translate(key: string): string | undefined;
  cabinetType(type: string): string;
  status(status: string): string;
}

export interface FormattedProjectEvent {
  id: number;
  title: string;
  /** `dd.MM.yyyy HH:mm` */
  when: string;
  actor: string | null;
  version: number;
  lines: string[];
  restorable: boolean;
}

/** Opis zdarzenia osi czasu po polsku z kodów i liczb podsumowania z backendu. */
export function formatProjectEvent(event: ProjectEvent, labels: ProjectEventLabels): FormattedProjectEvent {
  const summary = event.summary ?? {};
  return {
    id: event.id,
    title: labels.translate(`PROJECT_EVENT.${event.type}`) ?? event.type,
    when: formatDateTime(event.createdAt),
    actor: event.actorName,
    version: event.version,
    lines: describe(event, summary, labels),
    restorable: event.restorable
  };
}

function describe(event: ProjectEvent, summary: ProjectEventSummary, labels: ProjectEventLabels): string[] {
  switch (event.type) {
    case 'CREATED':
      return [
        `Ściany: ${summary.wallsAfter ?? 0}, szafki: ${summary.cabinetsAfter ?? 0}`,
        ...costLine('Koszt', summary.totalCostAfter),
        ...(summary.sourceProjectId != null
          ? [`Kopia projektu #${summary.sourceProjectId}, wersja ${summary.sourceVersion ?? '?'}`]
          : [])
      ];
    case 'SAVED':
    case 'RESTORED': {
      const lines = [
        ...(summary.restoredFromVersion != null ? [`Przywrócono treść wersji ${summary.restoredFromVersion}`] : []),
        ...countChange('Szafki', summary.cabinetsBefore, summary.cabinetsAfter),
        ...typeList('Dodano', summary.addedByType, labels),
        ...typeList('Usunięto', summary.removedByType, labels),
        ...costChange(summary.totalCostBefore, summary.totalCostAfter),
        ...changedFields(summary.changedFields, labels)
      ];
      return lines.length > 0 ? lines : ['Bez zmian treści'];
    }
    case 'STATUS_CHANGED':
      return [`${labels.status(summary.statusFrom ?? '')} → ${labels.status(summary.statusTo ?? '')}`];
    case 'PRICING_CHANGED':
      return changedFields(summary.changedFields, labels);
    case 'OFFER_GENERATED':
      return costLine('Cena oferty', summary.offerPrice);
  }
}

function countChange(label: string, before: number | undefined, after: number | undefined): string[] {
  return before != null && after != null && before !== after ? [`${label}: ${before} → ${after}`] : [];
}

function typeList(label: string, byType: Record<string, number> | undefined, labels: ProjectEventLabels): string[] {
  const entries = Object.entries(byType ?? {});
  if (entries.length === 0) {
    return [];
  }
  return [`${label}: ${entries.map(([type, count]) => `${count}× ${labels.cabinetType(type)}`).join(', ')}`];
}

function costChange(before: number | undefined, after: number | undefined): string[] {
  if (before == null || after == null || before === after) {
    return [];
  }
  return [`Koszt: ${formatMoney(before)} → ${formatMoney(after)}`];
}

function costLine(label: string, value: number | undefined): string[] {
  return value != null ? [`${label}: ${formatMoney(value)}`] : [];
}

function changedFields(fields: string[] | undefined, labels: ProjectEventLabels): string[] {
  if (!fields?.length) {
    return [];
  }
  return [`Zmieniono: ${fields.map(field => labels.translate(`PROJECT_FIELD.${field}`) ?? field).join(', ')}`];
}

function formatMoney(value: number): string {
  return value.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });
}

function formatDateTime(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value ?? '');
  return match ? `${match[3]}.${match[2]}.${match[1]} ${match[4]}:${match[5]}` : value;
}
