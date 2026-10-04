import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { ErrorTranslationService } from '../../core/error/error-translation.service';
import { LanguageService } from '../../service/language.service';
import { DIALOG_WIDTH } from '../../shared/constants/dialog.constants';
import { TranslationService } from '../../translation/translation.service';
import {
  BulkCabinetChangeDialogComponent,
  BulkCabinetChangeDialogData
} from '../bulk-change/bulk-cabinet-change-dialog.component';
import { BulkCabinetChangeReportDialogComponent } from '../bulk-change/bulk-cabinet-change-report-dialog.component';
import { planBulkChange } from '../bulk-change/bulk-cabinet-change.planner';
import { OpeningType } from '../cabinet-form/model/kitchen-cabinet-constants';
import {
  BulkCabinetChange,
  BulkChangeReport,
  BulkChangeReportItem,
  CabinetCalculationResult
} from '../model/bulk-cabinet-change.model';
import { cabinetDisplayName } from '../model/cabinet-display-name';
import { KitchenCabinet } from '../model/kitchen-state.model';
import { DictionaryService } from './dictionary.service';
import { KitchenCabinetStateFactory } from './kitchen-cabinet-state.factory';
import { KitchenStateService } from './kitchen-state.service';
import { KitchenService } from './kitchen.service';
import { MaterialPresetService } from './material-preset.service';
import { ProjectRequestBuilderService } from './project-request-builder.service';

/**
 * Masowa zmiana szafek ściany albo projektu. Backend przelicza każdą zmienioną szafkę; przeliczone trafiają do stanu
 * jednym krokiem cofania, błędne i pominięte zostają bez zmian i trafiają do raportu.
 */
@Injectable({ providedIn: 'root' })
export class KitchenBulkCabinetChangeService {
  private readonly dialog = inject(MatDialog);
  private readonly stateService = inject(KitchenStateService);
  private readonly kitchenService = inject(KitchenService);
  private readonly requestBuilder = inject(ProjectRequestBuilderService);
  private readonly cabinetFactory = inject(KitchenCabinetStateFactory);
  private readonly errorTranslation = inject(ErrorTranslationService);
  private readonly dictionaryService = inject(DictionaryService);
  private readonly materialPresetService = inject(MaterialPresetService);
  private readonly translationService = inject(TranslationService);
  private readonly languageService = inject(LanguageService);

  /** Okno wyboru, zmiana i raport; `null` — anulowano. */
  run(): Observable<BulkChangeReport | null> {
    return this.dialogData().pipe(
      switchMap(data => this.dialog.open(BulkCabinetChangeDialogComponent, { width: DIALOG_WIDTH.STANDARD, data })
        .afterClosed()),
      switchMap((change: BulkCabinetChange | undefined) => change ? this.apply(change) : of(null)),
      map(report => {
        if (report) {
          this.dialog.open(BulkCabinetChangeReportDialogComponent, { width: DIALOG_WIDTH.STANDARD, data: report });
        }
        return report;
      })
    );
  }

  apply(change: BulkCabinetChange): Observable<BulkChangeReport> {
    const plan = planBulkChange(this.targetCabinets(change), change);
    const report: BulkChangeReport = { changed: 0, unchanged: plan.unchanged, skipped: plan.skipped, failed: [] };
    if (plan.updates.length === 0) {
      return of(report);
    }

    const materialDefaults = this.stateService.materialDefaults();
    const requests = plan.updates.map(cabinet => this.requestBuilder.buildCabinetConfiguration(cabinet,
      materialDefaults));
    return this.kitchenService.calculateCabinets(requests).pipe(
      map(results => this.applyResults(plan.updates, results, report))
    );
  }

  private applyResults(updates: KitchenCabinet[], results: CabinetCalculationResult[],
                       report: BulkChangeReport): BulkChangeReport {
    const resultById = new Map(results.map(result => [result.cabinetId, result]));
    const calculated: KitchenCabinet[] = [];
    const failed: BulkChangeReportItem[] = [];

    for (const cabinet of updates) {
      const outcome = resultById.get(cabinet.id);
      if (outcome?.result && !outcome.errors?.length) {
        calculated.push(this.cabinetFactory.withCalculation(cabinet, outcome.result));
      } else {
        failed.push({ cabinetId: cabinet.id, label: cabinetDisplayName(cabinet), reasons: this.errorReasons(outcome) });
      }
    }

    this.stateService.replaceCabinets(calculated);
    return { ...report, changed: calculated.length, failed };
  }

  private errorReasons(outcome: CabinetCalculationResult | undefined): string[] {
    if (!outcome?.errors?.length) {
      return ['brak wyniku kalkulacji'];
    }
    return outcome.errors.map(error => this.errorTranslation.translateFieldError(error).message);
  }

  private targetCabinets(change: BulkCabinetChange): KitchenCabinet[] {
    return change.scope === 'WALL'
      ? this.stateService.selectedWall()?.cabinets ?? []
      : this.stateService.walls().flatMap(wall => wall.cabinets);
  }

  private dialogData(): Observable<BulkCabinetChangeDialogData> {
    return forkJoin({
      presets: this.materialPresetService.listActive(),
      translations: this.translationService.getByCategories(['MATERIAL_PRESET'], this.languageService.lang())
    }).pipe(map(({ presets, translations }) => ({
      wallLabel: this.stateService.selectedWall()?.type ?? '',
      wallCabinetCount: this.stateService.selectedWall()?.cabinets.length ?? 0,
      projectCabinetCount: this.stateService.totalCabinetCount(),
      openingTypes: this.dictionaryService.data().openingTypes
        .filter(item => item.code !== 'NONE')
        .map(item => ({ value: item.code as OpeningType, label: item.label })),
      materialPresets: presets.map(preset => ({
        preset,
        label: translations[preset.translationKey] || preset.code
      }))
    })));
  }
}
