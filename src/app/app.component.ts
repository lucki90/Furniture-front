import { Component, OnInit } from '@angular/core';
import { SettingsService } from './settings/settings.service';
import { KitchenStateService } from './kitchen/service/kitchen-state.service';

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
    private readonly kitchenStateService: KitchenStateService
  ) {}

  ngOnInit(): void {
    // Load global user settings from DB — zapisz jako globalne defaults
    // (używane przez clearAll/addWall przy tworzeniu nowych projektów)
    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        this.kitchenStateService.setGlobalDefaults({
          plinthHeightMm: settings.defaultPlinthHeightMm,
          countertopThicknessMm: settings.defaultCountertopThicknessMm,
          upperFillerHeightMm: settings.defaultUpperFillerHeightMm
        });
      },
      error: (err) => {
        // Non-critical: app still works with Angular signal defaults (100/38/100)
        console.warn('Could not load user settings from server, using defaults.', err);
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}
