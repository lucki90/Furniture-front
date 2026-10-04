import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { LanguageService } from '../../service/language.service';
import { TranslationService } from '../../translation/translation.service';
import { ProjectEvent } from '../model/project-history.model';
import { ProjectHistoryService } from '../service/project-history.service';
import { ProjectHistoryPanelComponent } from './project-history-panel.component';

describe('ProjectHistoryPanelComponent', () => {
  let fixture: ComponentFixture<ProjectHistoryPanelComponent>;
  let component: ProjectHistoryPanelComponent;
  let history: jasmine.SpyObj<ProjectHistoryService>;

  const events: ProjectEvent[] = [
    { id: 2, type: 'SAVED', version: 2, actorName: 'Jan Stolarz', createdAt: '2026-10-04 12:30:00',
      summary: { cabinetsBefore: 1, cabinetsAfter: 2, addedByType: { BASE_WITH_DRAWERS: 1 } }, restorable: true },
    { id: 1, type: 'STATUS_CHANGED', version: 1, actorName: null, createdAt: '2026-10-04 12:00:00',
      summary: { statusFrom: 'DRAFT', statusTo: 'OFFER_SENT' }, restorable: false }
  ];

  beforeEach(async () => {
    history = jasmine.createSpyObj<ProjectHistoryService>('ProjectHistoryService', ['getHistory']);
    await TestBed.configureTestingModule({
      imports: [ProjectHistoryPanelComponent],
      providers: [
        { provide: ProjectHistoryService, useValue: history },
        { provide: TranslationService, useValue: { getByCategories: () => of({ 'PROJECT_EVENT.SAVED': 'Zapis projektu' }) } },
        { provide: LanguageService, useValue: { lang: signal('pl') } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectHistoryPanelComponent);
    component = fixture.componentInstance;
  });

  function open(projectId: number | null, version = 2): void {
    fixture.componentRef.setInput('projectId', projectId);
    fixture.componentRef.setInput('projectVersion', version);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
  }

  it('po otwarciu pokazuje oś czasu z tytułami, wersją i opisem', () => {
    history.getHistory.and.returnValue(of(events));

    open(6);

    const text = fixture.nativeElement.textContent;
    expect(history.getHistory).toHaveBeenCalledWith(6);
    expect(text).toContain('Zapis projektu');
    expect(text).toContain('wersja 2');
    expect(text).toContain('Dodano: 1× Dolna - szuflady');
    expect(text).toContain('Zmiana statusu');
    expect(text).toContain('Szkic → Oferta wysłana');
  });

  it('zamknięty panel i projekt bez id nie wczytują historii', () => {
    fixture.componentRef.setInput('projectId', 6);
    fixture.detectChanges();
    open(null);

    expect(history.getHistory).not.toHaveBeenCalled();
  });

  it('nowa wersja projektu przy otwartym panelu wczytuje historię ponownie', () => {
    history.getHistory.and.returnValue(of(events));
    open(6, 2);

    fixture.componentRef.setInput('projectVersion', 3);
    fixture.detectChanges();

    expect(history.getHistory).toHaveBeenCalledTimes(2);
  });

  it('błąd wczytania — komunikat i ponowienie', () => {
    history.getHistory.and.returnValue(throwError(() => new Error('500')));
    open(6);

    expect(fixture.nativeElement.textContent).toContain('Nie udało się wczytać historii projektu.');
    history.getHistory.and.returnValue(of(events));
    fixture.nativeElement.querySelector('.history-state--error button').click();
    fixture.detectChanges();

    expect(component.events().length).toBe(2);
  });
});
