import { Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { LanguageService } from '../../service/language.service';
import { TranslationService } from '../../translation/translation.service';

@Injectable({ providedIn: 'root' })
export class KitchenBomTranslationsService {
  private languageService = inject(LanguageService);
  private translationService = inject(TranslationService);

  watchTranslations() {
    return toObservable(this.languageService.lang).pipe(
      switchMap(lang => this.translationService.getByCategories(['BOARD_NAME', 'MATERIAL'], lang))
    );
  }
}
