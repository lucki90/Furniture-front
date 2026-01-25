import {Component} from '@angular/core';
import {CommonModule} from "@angular/common";
import {KitchenLayoutComponent} from "./kitchen-layout/kitchen-layout.component";
import {CabinetResultComponent} from "./cabinet-result/cabinet-result.component";
import {CabinetFormComponent} from "./cabinet-form/cabinet-form.component";

@Component({
  selector: 'app-kitchen-page',
  templateUrl: './kitchen-page.component.html',
  standalone: true,
  imports: [
    CommonModule,
    CabinetFormComponent,
    CabinetResultComponent,
    KitchenLayoutComponent
  ]
})
export class KitchenPageComponent {

  result: any | null = null;

  onCalculated(result: any) {
    this.result = result;
  }
}
