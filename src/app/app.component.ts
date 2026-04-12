import { Component, OnInit, effect } from '@angular/core';
import { SettingsService } from './settings/settings.service';
import { KitchenStateService } from './kitchen/service/kitchen-state.service';
import { DictionaryService } from './kitchen/service/dictionary.service';
import { LanguageService, AppLanguage } from './service/language.service';
import { TranslationService } from './translation/translation.service';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false
})
export class AppComponent implements OnInit {
  title = 'furniture-front';
  sidebarCollapsed = false;

  constructor(
    private readonly settingsService: SettingsService,
    private readonly kitchenStateService: KitchenStateService,
    private readonly dictionaryService: DictionaryService,
    private readonly translationService: TranslationService,
    readonly languageService: LanguageService,
    readonly authService: AuthService
  ) {
    // Przy każdej zmianie języka:
    // 1. Wyczyść cache tłumaczeń (aby komponenty pobrały nowe dane w nowym języku)
    // 2. Przeładuj słowniki (opcje dropdownów w formularzu szafek)
    effect(() => {
      const lang = this.languageService.lang();
      this.translationService.clearCache();
      this.dictionaryService.reload(lang);
    });
  }

  ngOnInit(): void {
    // Restore session from localStorage
    this.authService.initFromStorage();

    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        this.kitchenStateService.setGlobalDefaults({
          plinthHeightMm: settings.defaultPlinthHeightMm,
          countertopThicknessMm: settings.defaultCountertopThicknessMm,
          upperFillerHeightMm: settings.defaultUpperFillerHeightMm
        });
        this.kitchenStateService.setMaterialDefaults(settings);
      },
      error: (err) => {
        console.warn('Could not load user settings from server, using defaults.', err);
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onLanguageChange(event: Event): void {
    const lang = (event.target as HTMLSelectElement).value as AppLanguage;
    this.languageService.setLanguage(lang);
  }

  protected trackByCode = (_: number, item: { code: string }) => item.code;
}
