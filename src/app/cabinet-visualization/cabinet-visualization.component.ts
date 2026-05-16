import { AfterViewInit, Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';

@Component({
  selector: 'app-cabinet-visualization',
  templateUrl: './cabinet-visualization.component.html',
  styleUrls: ['./cabinet-visualization.component.css'],
  standalone: false
})
export class CabinetVisualizationComponent implements AfterViewInit, OnChanges {
  private static readonly BASE_CANVAS_WIDTH = 960;
  private static readonly BASE_CANVAS_HEIGHT = 560;

  private readonly colors = {
    background: '#f8fafc',
    bodyFill: '#d9e5ef',
    bodyStroke: '#29415a',
    shelfStroke: '#8aa0b6',
    drawerFillPrimary: '#dbeafe',
    drawerFillSecondary: '#e6f0f7',
    panelStroke: '#3f5f7d',
    muted: '#6b7280',
    title: '#1f2937',
    doorFill: '#edf4fa'
  } as const;

  @Input() width: number = 400;
  @Input() height: number = 600;
  @Input() shelfQuantity: number = 0;
  @Input() frontType: string = 'ONE_DOOR';
  @Input() drawerQuantity: number = 0;

  @ViewChild('cabinetCanvas') private readonly canvasRef?: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit(): void {
    this.drawCabinet();
  }

  ngOnChanges(): void {
    this.drawCabinet();
  }

  drawCabinet(): void {
    const canvas = this.canvasRef?.nativeElement;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) {
      return;
    }

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const displayWidth = Math.max(
      Math.round(canvas.clientWidth || CabinetVisualizationComponent.BASE_CANVAS_WIDTH),
      1
    );
    const fallbackHeight =
      (displayWidth * CabinetVisualizationComponent.BASE_CANVAS_HEIGHT) /
      CabinetVisualizationComponent.BASE_CANVAS_WIDTH;
    const displayHeight = Math.max(
      Math.round(canvas.clientHeight || fallbackHeight || CabinetVisualizationComponent.BASE_CANVAS_HEIGHT),
      1
    );
    const pixelWidth = Math.round(displayWidth * dpr);
    const pixelHeight = Math.round(displayHeight * dpr);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const safeWidth = Math.max(Number(this.width) || 100, 100);
    const safeHeight = Math.max(Number(this.height) || 100, 100);
    const safeShelves = Math.max(Number(this.shelfQuantity) || 0, 0);
    const safeDrawers = Math.max(Number(this.drawerQuantity) || 0, 0);

    const canvasWidth = displayWidth;
    const canvasHeight = displayHeight;
    const paddingX = 82;
    const paddingY = 72;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const scaleFactor = Math.min(
      (canvasWidth - paddingX * 2) / safeWidth,
      (canvasHeight - paddingY * 2) / safeHeight
    );

    const cabinetWidth = safeWidth * scaleFactor;
    const cabinetHeight = safeHeight * scaleFactor;
    const originX = (canvasWidth - cabinetWidth) / 2;
    const originY = (canvasHeight - cabinetHeight) / 2;
    const bodyThickness = Math.max(10, Math.min(18, cabinetWidth * 0.035));

    ctx.save();

    ctx.fillStyle = this.colors.background;
    ctx.fillRect(originX, originY, cabinetWidth, cabinetHeight);

    ctx.fillStyle = this.colors.bodyFill;
    ctx.fillRect(originX, originY, cabinetWidth, bodyThickness);
    ctx.fillRect(originX, originY + cabinetHeight - bodyThickness, cabinetWidth, bodyThickness);
    ctx.fillRect(originX, originY, bodyThickness, cabinetHeight);
    ctx.fillRect(originX + cabinetWidth - bodyThickness, originY, bodyThickness, cabinetHeight);

    ctx.strokeStyle = this.colors.bodyStroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(originX, originY, cabinetWidth, cabinetHeight);

    if (safeShelves > 0) {
      const usableHeight = cabinetHeight - bodyThickness * 2;
      const shelfSpacing = usableHeight / (safeShelves + 1);
      ctx.strokeStyle = this.colors.shelfStroke;
      ctx.lineWidth = 2;

      for (let shelfIndex = 1; shelfIndex <= safeShelves; shelfIndex++) {
        const y = originY + bodyThickness + shelfSpacing * shelfIndex;
        ctx.beginPath();
        ctx.moveTo(originX + bodyThickness, y);
        ctx.lineTo(originX + cabinetWidth - bodyThickness, y);
        ctx.stroke();
      }
    }

    if (this.frontType === 'DRAWER' && safeDrawers > 0) {
      const drawerGap = 6;
      const usableHeight = cabinetHeight - drawerGap * (safeDrawers + 1);
      const drawerHeight = usableHeight / safeDrawers;

      for (let drawerIndex = 0; drawerIndex < safeDrawers; drawerIndex++) {
        const drawerY = originY + drawerGap + drawerIndex * (drawerHeight + drawerGap);
        ctx.fillStyle =
          drawerIndex % 2 === 0 ? this.colors.drawerFillPrimary : this.colors.drawerFillSecondary;
        ctx.fillRect(originX + drawerGap, drawerY, cabinetWidth - drawerGap * 2, drawerHeight);
        ctx.strokeStyle = this.colors.panelStroke;
        ctx.lineWidth = 1.6;
        ctx.strokeRect(originX + drawerGap, drawerY, cabinetWidth - drawerGap * 2, drawerHeight);

        const handleY = drawerY + drawerHeight / 2;
        ctx.strokeStyle = this.colors.muted;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(originX + cabinetWidth * 0.35, handleY);
        ctx.lineTo(originX + cabinetWidth * 0.65, handleY);
        ctx.stroke();
      }
    } else if (this.frontType === 'OPEN') {
      ctx.strokeStyle = this.colors.shelfStroke;
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.strokeRect(originX + 10, originY + 10, cabinetWidth - 20, cabinetHeight - 20);
      ctx.setLineDash([]);
    } else {
      const doorGap = 8;
      const innerX = originX + doorGap;
      const innerY = originY + doorGap;
      const innerWidth = cabinetWidth - doorGap * 2;
      const innerHeight = cabinetHeight - doorGap * 2;

      ctx.strokeStyle = this.colors.panelStroke;
      ctx.lineWidth = 2;

      if (this.frontType === 'ONE_DOOR' || this.frontType === 'UPWARDS') {
        ctx.fillStyle = this.colors.doorFill;
        ctx.fillRect(innerX, innerY, innerWidth, innerHeight);
        ctx.strokeRect(innerX, innerY, innerWidth, innerHeight);
        if (this.frontType === 'UPWARDS') {
          this.drawHandle(ctx, innerX + innerWidth / 2 - 28, innerY + 14, 56, 4);
        } else {
          this.drawHandle(ctx, innerX + innerWidth - 16, innerY + innerHeight / 2 - 18, 4, 36);
        }
      } else {
        const halfWidth = innerWidth / 2;
        ctx.fillStyle = this.colors.doorFill;
        ctx.fillRect(innerX, innerY, halfWidth - 3, innerHeight);
        ctx.fillRect(innerX + halfWidth + 3, innerY, halfWidth - 3, innerHeight);
        ctx.strokeRect(innerX, innerY, halfWidth - 3, innerHeight);
        ctx.strokeRect(innerX + halfWidth + 3, innerY, halfWidth - 3, innerHeight);
        this.drawHandle(ctx, innerX + halfWidth - 14, innerY + innerHeight / 2 - 18, 4, 36);
        this.drawHandle(ctx, innerX + halfWidth + 10, innerY + innerHeight / 2 - 18, 4, 36);
      }
    }

    ctx.fillStyle = this.colors.title;
    ctx.font = '600 18px DM Sans, Segoe UI, sans-serif';
    ctx.fillText(`${safeWidth} x ${safeHeight} mm`, originX, originY - 22);
    ctx.font = '500 13px DM Sans, Segoe UI, sans-serif';
    ctx.fillStyle = this.colors.muted;
    ctx.fillText(`front: ${this.frontType} | shelves: ${safeShelves}`, originX, originY - 4);

    ctx.restore();
  }

  private drawHandle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    ctx.fillStyle = this.colors.muted;
    ctx.fillRect(x, y, width, height);
  }
}
