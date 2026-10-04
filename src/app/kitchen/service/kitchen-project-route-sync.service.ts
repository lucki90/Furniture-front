import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, finalize, map } from 'rxjs/operators';
import { ApiErrorHandler } from '../../core/error/api-error-handler.service';
import { ToastService } from '../../core/error/toast.service';
import { KitchenProjectTransitionGuardService } from './kitchen-project-transition-guard.service';
import { KitchenService } from './kitchen.service';
import { KitchenStateService } from './kitchen-state.service';

/** Parametr adresu edytora kuchni wskazujący zapisany projekt (`/kitchen?projectId=<id>`). */
export const PROJECT_ID_QUERY_PARAM = 'projectId';

export interface KitchenProjectRouteHooks {
  /** Edytor dostał nowy stan (wczytany projekt albo czysty projekt po błędzie) — wyczyść lokalny stan widoku. */
  onWorkspaceReplaced: () => void;
}

/** Zwraca identyfikator projektu z parametru adresu albo `null`, gdy wartość nie jest dodatnią liczbą całkowitą. */
export function parseProjectIdParam(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }
  const projectId = Number(value);
  return Number.isSafeInteger(projectId) && projectId > 0 ? projectId : null;
}

/**
 * Jedyny punkt odczytu parametru `projectId` z adresu edytora kuchni.
 *
 * Stan edytora żyje w pamięci (`KitchenStateService`), a adres przetrwa odświeżenie strony, link i nawigację
 * wstecz. Gdy adres wskazuje inny projekt niż otwarty, serwis wczytuje go tą samą ścieżką co „Otwórz” z listy
 * (`KitchenStateService.loadProject` → `KitchenProjectStateMapper`), a niezapisane zmiany chroni guard przejść.
 * Projekt już otwarty (np. po „Otwórz” albo klonowaniu) nie jest wczytywany ponownie. Gdy przejście nie dojdzie
 * do skutku, adres wraca do projektu otwartego w edytorze, żeby nie wskazywał innego projektu.
 * Adres bez `projectId` nie zmienia stanu edytora (np. powrót z ustawień zachowuje bieżącą pracę).
 */
@Injectable()
export class KitchenProjectRouteSyncService {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stateService = inject(KitchenStateService);
  private readonly kitchenService = inject(KitchenService);
  private readonly transitionGuard = inject(KitchenProjectTransitionGuardService);
  private readonly errorHandler = inject(ApiErrorHandler);
  private readonly toast = inject(ToastService);

  private readonly loadingProjectIdState = signal<number | null>(null);
  /** Projekt wczytywany z adresu; edytor jest wtedy zablokowany. */
  readonly loadingProjectId = this.loadingProjectIdState.asReadonly();

  private pendingLoad: Subscription | null = null;
  private requestSequence = 0;

  connect(hooks: KitchenProjectRouteHooks): void {
    this.route.queryParamMap.pipe(
      map(params => params.get(PROJECT_ID_QUERY_PARAM)),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(rawProjectId => this.onProjectIdParam(rawProjectId, hooks));
    this.destroyRef.onDestroy(() => this.cancelPendingLoad());
  }

  private onProjectIdParam(rawProjectId: string | null, hooks: KitchenProjectRouteHooks): void {
    const request = ++this.requestSequence;
    this.cancelPendingLoad();
    if (rawProjectId === null) {
      return;
    }

    const projectId = parseProjectIdParam(rawProjectId);
    if (projectId === null) {
      this.toast.error('Adres strony zawiera nieprawidłowy identyfikator projektu.');
      this.syncUrlWithOpenProject();
      return;
    }
    if (projectId === this.stateService.currentProjectId()) {
      return;
    }

    this.transitionGuard.confirmUnsavedAndProceed('otwórz projekt z adresu strony', {
      onProceed: () => {
        if (this.isCurrentRequest(request)) {
          this.loadProject(projectId, hooks);
        }
      },
      onAbort: () => {
        if (this.isCurrentRequest(request)) {
          this.syncUrlWithOpenProject();
        }
      }
    });
  }

  private loadProject(projectId: number, hooks: KitchenProjectRouteHooks): void {
    this.loadingProjectIdState.set(projectId);
    this.pendingLoad = this.kitchenService.getProjectById(projectId).pipe(
      finalize(() => this.loadingProjectIdState.set(null))
    ).subscribe({
      next: project => {
        this.stateService.loadProject(project);
        hooks.onWorkspaceReplaced();
      },
      error: err => this.handleLoadError(err, hooks)
    });
  }

  private handleLoadError(err: unknown, hooks: KitchenProjectRouteHooks): void {
    if ((err as { status?: number })?.status === 401) {
      // Wygasła sesja: interceptor wylogowuje i przenosi na logowanie — nie nadpisuj tej nawigacji.
      return;
    }

    console.error('Error loading project from URL:', err);
    this.errorHandler.handle(err);
    this.stateService.startNewProject();
    hooks.onWorkspaceReplaced();
    this.syncUrlWithOpenProject();
  }

  /**
   * Ustawia w adresie projekt otwarty w edytorze; nowy projekt usuwa parametr. Wołaj także po zmianie projektu bez
   * nawigacji (zapis nowego projektu, wyczyszczenie edytora), żeby odświeżenie strony nie wczytało innego projektu.
   */
  syncUrlWithOpenProject(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [PROJECT_ID_QUERY_PARAM]: this.stateService.currentProjectId() },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private isCurrentRequest(request: number): boolean {
    return request === this.requestSequence;
  }

  private cancelPendingLoad(): void {
    this.pendingLoad?.unsubscribe();
    this.pendingLoad = null;
  }
}
