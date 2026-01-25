import { Component } from '@angular/core';
import {KitchenCabinetRequest, KitchenLayoutResponse, KitchenWall} from "./kitchen-layout.model";
import {KitchenService} from "../service/kitchen.service";
import {CommonModule} from "@angular/common";

@Component({
  selector: 'app-kitchen-layout',
  templateUrl: './kitchen-layout.component.html',
  styleUrls: ['./kitchen-layout.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class KitchenLayoutComponent {

  wall: KitchenWall = {
    length: 3600,
    height: 2600
  };

  cabinets: KitchenCabinetRequest[] = [
    { cabinetId: 'c1', width: 600, height: 825 },
    { cabinetId: 'c2', width: 800, height: 825 },
    { cabinetId: 'c3', width: 600, height: 825 }
  ];

  result?: KitchenLayoutResponse;
  loading = false;

  constructor(private layoutService: KitchenService) {}

  calculate(): void {
    this.loading = true;

    this.layoutService.postKitchenLayout({
      wall: this.wall,
      cabinets: this.cabinets
    }).subscribe({
      next: res => {
        this.result = res;
        this.loading = false;
      },
      error: err => {
        console.error(err);
        this.loading = false;
      }
    });
  }
}

