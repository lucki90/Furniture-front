import { ProjectEvent } from '../model/project-history.model';
import { formatProjectEvent, ProjectEventLabels } from './project-event-formatter';

describe('formatProjectEvent — opis zdarzenia osi czasu', () => {
  const translations: Record<string, string> = {
    'PROJECT_EVENT.SAVED': 'Zapis projektu',
    'PROJECT_EVENT.CREATED': 'Utworzenie projektu',
    'PROJECT_FIELD.clientName': 'klient',
    'PROJECT_FIELD.discountPct': 'rabat'
  };
  const labels: ProjectEventLabels = {
    translate: key => translations[key],
    cabinetType: type => ({ BASE_WITH_DRAWERS: 'Dolna z szufladami' } as Record<string, string>)[type] ?? type,
    status: status => ({ DRAFT: 'Szkic', OFFER_SENT: 'Oferta wysłana' } as Record<string, string>)[status] ?? status
  };
  const event = (overrides: Partial<ProjectEvent>): ProjectEvent => ({
    id: 1, type: 'SAVED', version: 2, actorName: 'Jan Stolarz', createdAt: '2026-10-04 12:30:00',
    summary: null, restorable: true, ...overrides
  });

  it('H2: zapis — liczba szafek, dodane według typu, koszt i zmienione pola', () => {
    const formatted = formatProjectEvent(event({
      summary: {
        cabinetsBefore: 3, cabinetsAfter: 4, addedByType: { BASE_WITH_DRAWERS: 1 },
        totalCostBefore: 3000, totalCostAfter: 4200, changedFields: ['clientName']
      }
    }), labels);

    expect(formatted.title).toBe('Zapis projektu');
    expect(formatted.when).toBe('04.10.2026 12:30');
    expect(formatted.lines[0]).toBe('Szafki: 3 → 4');
    expect(formatted.lines[1]).toBe('Dodano: 1× Dolna z szufladami');
    expect(formatted.lines[2]).toContain('Koszt:');
    expect(formatted.lines[2]).toContain('→');
    expect(formatted.lines[3]).toBe('Zmieniono: klient');
  });

  it('zapis bez zmian treści i przywrócenie wersji', () => {
    expect(formatProjectEvent(event({ summary: { cabinetsBefore: 2, cabinetsAfter: 2, changedFields: [] } }), labels)
      .lines).toEqual(['Bez zmian treści']);
    expect(formatProjectEvent(event({ type: 'RESTORED', summary: { restoredFromVersion: 1 } }), labels).lines)
      .toEqual(['Przywrócono treść wersji 1']);
  });

  it('utworzenie z klonu, status, wycena i oferta', () => {
    expect(formatProjectEvent(event({
      type: 'CREATED', summary: { wallsAfter: 1, cabinetsAfter: 3, sourceProjectId: 7, sourceVersion: 5 }
    }), labels).lines).toEqual(['Ściany: 1, szafki: 3', 'Kopia projektu #7, wersja 5']);
    expect(formatProjectEvent(event({ type: 'STATUS_CHANGED', summary: { statusFrom: 'DRAFT', statusTo: 'OFFER_SENT' } }),
      labels).lines).toEqual(['Szkic → Oferta wysłana']);
    expect(formatProjectEvent(event({ type: 'PRICING_CHANGED', summary: { changedFields: ['discountPct'] } }), labels)
      .lines).toEqual(['Zmieniono: rabat']);
    expect(formatProjectEvent(event({ type: 'OFFER_GENERATED', summary: { offerPrice: 12500 } }), labels).lines[0])
      .toContain('Cena oferty:');
  });

  it('brak tłumaczenia typu — kod zdarzenia', () => {
    expect(formatProjectEvent(event({ type: 'OFFER_GENERATED' }), labels).title).toBe('OFFER_GENERATED');
  });
});
