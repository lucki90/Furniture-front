import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, forkJoin } from 'rxjs';
import { LanguageService } from '../../service/language.service';
import { DEFAULT_TRANSLATIONS } from '../../translation/default-translations';
import { TranslationService } from '../../translation/translation.service';
import { CABINET_TYPE_PICKER_LABELS } from '../cabinet-form/types/cabinet-type-labels';
import { getStatusLabel, ProjectStatus } from '../model/kitchen-project.model';
import { ProjectHistoryService } from '../service/project-history.service';
import { FormattedProjectEvent, formatProjectEvent, ProjectEventLabels } from './project-event-formatter';

const HISTORY_TRANSLATION_CATEGORIES = ['PROJECT_EVENT', 'PROJECT_FIELD'];

/**
 * Panel „Historia projektu” — oś czasu zdarzeń zapisanego projektu. Wczytuje się przy otwarciu i po zmianie wersji
 * projektu (np. po zapisie).
 */
@Component({
  selector: 'app-project-history-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-history-panel.component.html',
  styleUrls: ['./project-history-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectHistoryPanelComponent implements OnChanges {
  private readonly historyService = inject(ProjectHistoryService);
  private readonly translationService = inject(TranslationService);
  private readonly languageService = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() open = false;
  @Input() projectId: number | null = null;
  @Input() projectVersion: number | null = null;

  @Output() closeRequested = new EventEmitter<void>();
  /** Otwarcie wersji w edytorze (zapis przywróci ją jako bieżącą). */
  @Output() openVersion = new EventEmitter<number>();
  /** Kopia wersji jako nowy projekt. */
  @Output() cloneVersion = new EventEmitter<number>();

  readonly events = signal<FormattedProjectEvent[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private loadSubscription: Subscription | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    const relevant = changes['open'] || changes['projectId'] || changes['projectVersion'];
    if (relevant && this.open && this.projectId !== null) {
      this.load(this.projectId);
    }
  }

  requestClose(): void {
    this.closeRequested.emit();
  }

  reload(): void {
    if (this.projectId !== null) {
      this.load(this.projectId);
    }
  }

  protected trackById = (_: number, event: FormattedProjectEvent) => event.id;
  protected trackByIndex = (index: number) => index;

  private load(projectId: number): void {
    this.loadSubscription?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.loadSubscription = forkJoin({
      events: this.historyService.getHistory(projectId),
      translations: this.translationService.getByCategories(HISTORY_TRANSLATION_CATEGORIES,
        this.languageService.lang())
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ events, translations }) => {
        const labels = this.labels(translations);
        this.events.set(events.map(event => formatProjectEvent(event, labels)));
        this.loading.set(false);
      },
      error: () => {
        this.events.set([]);
        this.error.set('Nie udało się wczytać historii projektu.');
        this.loading.set(false);
      }
    });
  }

  private labels(translations: Record<string, string>): ProjectEventLabels {
    return {
      translate: key => translations[key] ?? DEFAULT_TRANSLATIONS[key],
      cabinetType: type => (CABINET_TYPE_PICKER_LABELS as Record<string, string>)[type] ?? type,
      status: status => getStatusLabel(status as ProjectStatus)
    };
  }
}
