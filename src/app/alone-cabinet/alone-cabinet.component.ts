import { Component, OnInit } from '@angular/core';
import { AloneCabinetService } from '../alone-cabinet.service';

@Component({
  selector: 'app-alone-cabinet',
  templateUrl: './alone-cabinet.component.html',
  styleUrls: ['./alone-cabinet.component.css']
})
export class AloneCabinetComponent {
  height: number = 0;
  width: number = 0;
  depth: number = 0;
  shelfQuantity: number = 1;
  oneFront: boolean = true;
  response: any;


  constructor(private cabinetService: AloneCabinetService) { }

  calculateCabinet() {
    const requestBody = {
      height: this.height,
      width: this.width,
      depth: this.depth,
      shelfQuantity: this.shelfQuantity,
      oneFront: this.oneFront
    };

    this.cabinetService.calculateCabinet(requestBody).subscribe(
      (response) => {
        this.response = response;
      },
      (error) => {
        console.error('Error:', error);
      }
    );
  }
}
