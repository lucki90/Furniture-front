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
  shelfQuantity: number = 0;
  drawerQuantity: number = 0;
  oneFront: boolean = true;
  needBacks: boolean = true;
  frontType: string = 'ONE_FRONT';

  boxMaterial: string = 'CHIPBOARD';
  boxBoardThickness: number = 18;
  boxColor: string = 'czerwony';

  frontMaterial: string = 'CHIPBOARD';
  frontBoardThickness: number = 18;
  frontColor: string = 'bialy';

  response: any;

  frontTypes = [
    { value: 'OPEN', label: 'Otwarta' },
    { value: 'ONE_FRONT', label: 'Jeden front' },
    { value: 'TWO_FRONTS', label: 'Dwa fronty' },
    { value: 'DRAWER', label: 'Szuflady' }
  ];

  materials = [
    { value: 'CHIPBOARD', label: 'Drewno' },
    { value: 'GLASS', label: 'Szkło' },
    { value: 'PLASTIC', label: 'Plastik' }
  ];
  thicknesses = [16, 18, 20];
  colors = ['bialy', 'czarny', 'czerwony'];

  onFrontTypeChange(): void {
    // Resetuje ilość szuflad, jeśli wybrano inny typ frontu
    if (this.frontType !== 'DRAWER') {
      this.drawerQuantity = 0;
    }
  }

  constructor(private cabinetService: AloneCabinetService) { }

  calculateCabinet() {
    const requestBody = {
      height: this.height,
      width: this.width,
      depth: this.depth,
      shelfQuantity: this.shelfQuantity,
      oneFront: this.oneFront,
      needBacks: this.needBacks,
      frontType: this.frontType,
      drawerQuantity: this.frontType === 'DRAWER' ? this.drawerQuantity : null,
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
