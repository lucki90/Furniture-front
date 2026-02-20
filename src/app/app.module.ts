import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AloneCabinetComponent } from './alone-cabinet/alone-cabinet.component';
import { SecretLockerComponent } from './secret-locker/secret-locker.component';
import { CabinetFormComponent } from './kitchen/cabinet-form/cabinet-form.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { PrintDocComponent } from './print-doc/print-doc.component';
import { CabinetVisualizationComponent } from './cabinet-visualization/cabinet-visualization.component';
import { RadioButtonComponent } from './utils/radio-button/radio-button.component';
import { DropdownComponent } from './utils/dropdown/dropdown.component';
import { NumericInputComponent } from './utils/numeric-input/numeric-input.component';
import { MaxLengthForNumberDirective } from "./utils/directives/maxLengthForNumberDirective";
import { CabinetResultComponent } from "./kitchen/cabinet-result/cabinet-result.component";
import { KitchenPageComponent } from "./kitchen/kitchen-page.component";
import { ToastContainerComponent } from "./core/error/toast-container.component";

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
    BrowserAnimationsModule,
    AppRoutingModule,
    RouterModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    CabinetFormComponent,
    CabinetResultComponent,
    KitchenPageComponent,
    ToastContainerComponent
  ],
  providers: [provideHttpClient(withInterceptorsFromDi())],
  bootstrap: [AppComponent]
})
export class AppModule {
}
