import { Component, OnInit } from '@angular/core';
import { AloneCabinetService } from '../alone-cabinet.service';

@Component({
  selector: 'app-alone-cabinet',
  templateUrl: './alone-cabinet.component.html',
  styleUrls: ['./alone-cabinet.component.css']
})
export class AloneCabinetComponent {
  x: number = 0;
  y: number = 0;
  z: number = 0;
  result: any = null;


  constructor(private aloneCabinetService: AloneCabinetService) { }

  onSubmit() {
    const requestData = { x: this.x, y: this.y, z: this.z };
    this.aloneCabinetService.calculate(requestData).subscribe(
      (response) => {
        this.result = response;
      },
      (error) => {
        console.error('Error:', error);
      }
    );
  } 


  // ngOnInit(): void {
  // }

}
