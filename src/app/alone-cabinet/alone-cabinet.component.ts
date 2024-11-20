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
  needBacks: boolean = true;

  boxMaterial: string = 'CHIPBOARD';
  boxBoardThickness: number = 1.8;
  boxColor: string = 'czerwony';

  frontMaterial: string = 'CHIPBOARD';
  frontBoardThickness: number = 1.8;
  frontColor: string = 'bialy';

  response: any;

  materials = [
    { value: 'CHIPBOARD', label: 'Drewno' },
    { value: 'GLASS', label: 'Szkło' },
    { value: 'PLASTIC', label: 'Plastik' }
  ];
  thicknesses = [1.6, 1.8, 2.0];
  colors = ['bialy', 'czarny', 'czerwony'];

  constructor(private cabinetService: AloneCabinetService) { }

  calculateCabinet() {
    const requestBody = {
      height: this.height,
      width: this.width,
      depth: this.depth,
      shelfQuantity: this.shelfQuantity,
      oneFront: this.oneFront,
      needBacks: this.needBacks,
      materialRequest: {
        boxMaterial: this.boxMaterial,
        boxBoardThickness: this.boxBoardThickness,
        boxColor: this.boxColor,
        frontMaterial: this.frontMaterial,
        frontBoardThickness: this.frontBoardThickness,
        frontColor: this.frontColor
      }
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
