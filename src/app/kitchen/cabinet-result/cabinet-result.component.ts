import {Component, Input} from '@angular/core';
import {CommonModule} from "@angular/common";

@Component({
  selector: 'app-cabinet-result',
  templateUrl: './cabinet-result.component.html',
  styleUrls: ['./cabinet-result.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class CabinetResultComponent {

  @Input()
  result!: any;
}
