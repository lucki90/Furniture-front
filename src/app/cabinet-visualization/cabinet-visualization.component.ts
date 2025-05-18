import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-cabinet-visualization',
  templateUrl: './cabinet-visualization.component.html',
  styleUrls: ['./cabinet-visualization.component.css']
})
export class CabinetVisualizationComponent {
  @Input() width: number = 400;
  @Input() height: number = 600;
  @Input() shelfQuantity: number = 0;
  @Input() frontType: string = 'ONE_DOOR';
  @Input() drawerQuantity: number = 0;

  drawCabinet(): void {
    const canvas = document.getElementById('cabinetCanvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Resetowanie canvasu
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Proporcje szafki
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const scaleFactor = Math.min(
      canvasWidth / (this.width || 100),
      canvasHeight / (this.height || 100)
    );

    const cabinetWidth = (this.width || 100) * scaleFactor;
    const cabinetHeight = (this.height || 100) * scaleFactor;

    // Korpus
    ctx.fillStyle = '#ddd';
    ctx.fillRect(
      (canvasWidth - cabinetWidth) / 2,
      (canvasHeight - cabinetHeight) / 2,
      cabinetWidth,
      cabinetHeight
    );

    // Półki
    const shelfQuantity = this.shelfQuantity || 0;
    if (shelfQuantity > 0) {
      const shelfHeight = cabinetHeight / (shelfQuantity + 1);
      ctx.strokeStyle = '#000';
      for (let i = 1; i <= shelfQuantity; i++) {
        ctx.beginPath();
        ctx.moveTo((canvasWidth - cabinetWidth) / 2, (canvasHeight - cabinetHeight) / 2 + i * shelfHeight);
        ctx.lineTo((canvasWidth + cabinetWidth) / 2, (canvasHeight - cabinetHeight) / 2 + i * shelfHeight);
        ctx.stroke();
      }
    }

    // Fronty/Szuflady
    if (this.frontType === 'DRAWER' && this.drawerQuantity) {
      const drawerHeight = cabinetHeight / this.drawerQuantity;
      ctx.fillStyle = '#888';
      for (let i = 0; i < this.drawerQuantity; i++) {
        ctx.fillRect(
          (canvasWidth - cabinetWidth) / 2,
          (canvasHeight - cabinetHeight) / 2 + i * drawerHeight,
          cabinetWidth,
          drawerHeight - 5
        );
      }
    } else {
      ctx.strokeStyle = '#000';
      ctx.strokeRect(
        (canvasWidth - cabinetWidth) / 2,
        (canvasHeight - cabinetHeight) / 2,
        cabinetWidth,
        cabinetHeight
      );
    }
  }
}
