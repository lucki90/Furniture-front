import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subscription, catchError, defer, finalize, forkJoin, map, of, take, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../service/language.service';
import { DEFAULT_TRANSLATIONS } from '../../translation/default-translations';
import { TranslationService } from '../../translation/translation.service';
import {
  CabinetPresetOption,
  CabinetPresetResponse,
  CreateCabinetPresetRequest
} from '../model/cabinet-preset.model';
import { ProjectCabinetRequest } from '../model/kitchen-project.model';

const PRESET_TRANSLATION_CATEGORIES = ['CABINET_PRESET'];

/**
 * Presety szafek użytkownika i wbudowane: lista z etykietami (tłumaczenia wbudowanych) i operacje na własnych.
 * Stan współdzielony przez wybór presetu w formularzu i zarządzanie w ustawieniach.
 */
@Injectable({ providedIn: 'root' })
export class CabinetPresetService {
  private readonly http = inject(HttpClient);
  private readonly translationService = inject(TranslationService);
  private readonly languageService = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly baseUrl = `${environment.apiUrl}/kitchen/cabinet-presets`;

  private readonly _presets = signal<CabinetPresetResponse[]>([]);
  private readonly _translations = signal<Record<string, string>>({});
  private readonly _loaded = signal(false);
  private loading = false;
  /** Język ostatniego żądania słownika; null — serwis jeszcze nieużywany, więc zmiana języka niczego nie pobiera. */
  private translationLang: string | null = null;
  /** Numer ostatniego żądania słownika — odpowiedź starszego (inny język lub wcześniejsze wczytanie) jest odrzucana. */
  private translationSeq = 0;
  private translationSubscription?: Subscription;

  readonly presets = this._presets.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly options = computed<CabinetPresetOption[]>(() => {
    const translations = this._translations();
    return this._presets().map(preset => ({
      preset,
      label: cabinetPresetLabel(preset, translations),
      dimensions: `${preset.widthMm}×${preset.heightMm}×${preset.depthMm}`
    }));
  });
  readonly builtInOptions = computed(() => this.options().filter(option => option.preset.system));
  readonly ownOptions = computed(() => this.options().filter(option => !option.preset.system));

  constructor() {
    this.destroyRef.onDestroy(() => this.translationSubscription?.unsubscribe());
    effect(() => {
      const lang = this.languageService.lang();
      untracked(() => {
        if (this.translationLang !== null && this.translationLang !== lang) {
          this.refreshTranslations(lang);
        }
      });
    });
  }

  /**
   * Katalog presetów razem ze słownikiem. Błąd tłumaczeń nie unieważnia katalogu (etykiety zapasowe), błąd katalogu
   * jest błędem wczytania. Późniejsze zmiany języka podmieniają tylko słownik — katalog nie jest pobierany ponownie.
   */
  load(): Observable<void> {
    return defer(() => {
      this.loading = true;
      const seq = this.startTranslationRequest(this.languageService.lang());
      return forkJoin({
        presets: this.http.get<CabinetPresetResponse[]>(this.baseUrl),
        translations: this.fetchTranslations(this.languageService.lang())
      }).pipe(
        tap(({ presets, translations }) => {
          this._presets.set(presets);
          this._loaded.set(true);
          this.applyTranslations(seq, translations);
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading = false),
        map(() => undefined)
      );
    });
  }

  /** Wczytanie przy pierwszym użyciu; błąd zostawia pustą listę (wybór presetu jest wtedy ukryty). */
  ensureLoaded(): void {
    if (this._loaded() || this.loading) {
      return;
    }
    this.load().subscribe({ error: () => undefined });
  }

  private refreshTranslations(lang: string): void {
    const seq = this.startTranslationRequest(lang);
    this.translationSubscription = this.fetchTranslations(lang)
      .subscribe(translations => this.applyTranslations(seq, translations));
  }

  private startTranslationRequest(lang: string): number {
    this.translationSubscription?.unsubscribe();
    this.translationLang = lang;
    return ++this.translationSeq;
  }

  /** Słownik albo null przy błędzie (etykiety wracają wtedy do tłumaczeń domyślnych i klucza). */
  private fetchTranslations(lang: string): Observable<Record<string, string> | null> {
    return this.translationService.getByCategories(PRESET_TRANSLATION_CATEGORIES, lang)
      .pipe(take(1), catchError(() => of(null)));
  }

  private applyTranslations(seq: number, translations: Record<string, string> | null): void {
    if (seq === this.translationSeq) {
      this._translations.set(translations ?? {});
    }
  }

  create(name: string, cabinet: ProjectCabinetRequest): Observable<CabinetPresetResponse> {
    const request: CreateCabinetPresetRequest = { name, cabinet };
    return this.http.post<CabinetPresetResponse>(this.baseUrl, request).pipe(
      tap(preset => {
        if (this._loaded()) {
          this._presets.update(presets => [...presets, preset]);
        } else {
          // Lista nie była wczytana (np. błąd sieci) — dopisanie dałoby niepełny wybór bez wbudowanych.
          this.ensureLoaded();
        }
      })
    );
  }

  rename(presetId: number, name: string): Observable<CabinetPresetResponse> {
    return this.http.patch<CabinetPresetResponse>(`${this.baseUrl}/${presetId}`, { name }).pipe(
      tap(renamed => this._presets.update(presets =>
        presets.map(preset => preset.id === renamed.id ? renamed : preset)))
    );
  }

  remove(presetId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${presetId}`).pipe(
      tap(() => this._presets.update(presets => presets.filter(preset => preset.id !== presetId)))
    );
  }
}

/** Nazwa własnego presetu albo tłumaczenie wbudowanego (zapasowo — domyślne tłumaczenia i klucz). */
export function cabinetPresetLabel(preset: CabinetPresetResponse, translations: Record<string, string>): string {
  if (preset.name) {
    return preset.name;
  }
  const key = preset.translationKey ?? '';
  return translations[key] ?? DEFAULT_TRANSLATIONS[key] ?? key;
}
