import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {provideHttpClient, withInterceptorsFromDi} from '@angular/common/http';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {AloneCabinetComponent} from './alone-cabinet/alone-cabinet.component';
import {SecretLockerComponent} from './secret-locker/secret-locker.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatListModule} from '@angular/material/list';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {PrintDocComponent} from './print-doc/print-doc.component';
import {CabinetVisualizationComponent} from './cabinet-visualization/cabinet-visualization.component';
import {RadioButtonComponent} from './utils/radio-button/radio-button.component';
import {DropdownComponent} from './utils/dropdown/dropdown.component';
import {NumericInputComponent} from './utils/numeric-input/numeric-input.component';
import {MaxLengthForNumberDirective} from "./utils/directives/maxLengthForNumberDirective";

@NgModule({
  declarations: [
    AppComponent,
    AloneCabinetComponent,
    SecretLockerComponent,
    PrintDocComponent,
    CabinetVisualizationComponent,
    RadioButtonComponent,
    DropdownComponent,
    NumericInputComponent,
    MaxLengthForNumberDirective
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule, // Ważne dla Angular Material
    AppRoutingModule,
    MatSidenavModule, // Moduł dla mat-sidenav
    MatListModule,    // Moduł dla mat-list i mat-list-item
    MatButtonModule,  // Dla przycisków, jeśli będą używane
    MatIconModule,     // Dla ikon, jeśli będą używane
    FormsModule,
    ReactiveFormsModule

  ],
  providers: [provideHttpClient(withInterceptorsFromDi())],
  bootstrap: [AppComponent]
})
export class AppModule {
}
