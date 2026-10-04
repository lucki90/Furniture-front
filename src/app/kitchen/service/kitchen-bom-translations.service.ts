import { Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { LanguageService } from '../../service/language.service';
import { TranslationService } from '../../translation/translation.service';
import { WALL_BOARD_MATERIAL_CATEGORIES } from './wall-board-labels';

/** Kategorie tłumaczeń BOM: nazwy płyt szafek, materiały oraz materiały blatu i cokołu. */
const BOM_TRANSLATION_CATEGORIES = ['BOARD_NAME', 'MATERIAL', ...WALL_BOARD_MATERIAL_CATEGORIES];

@Injectable({ providedIn: 'root' })
export class KitchenBomTranslationsService {
  private languageService = inject(LanguageService);
  private translationService = inject(TranslationService);

  watchTranslations() {
    return toObservable(this.languageService.lang).pipe(
      switchMap(lang => this.translationService.getByCategories(BOM_TRANSLATION_CATEGORIES, lang))
    );
  }
}
