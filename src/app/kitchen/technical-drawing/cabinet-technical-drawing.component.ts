import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CabinetResponse } from '../cabinet-form/model/kitchen-cabinet-form.model';
import { buildTechnicalDrawingModel } from './technical-drawing.builder';
import { buildTechnicalDrawingLayout } from './technical-drawing.layout';
import type { DrawingLine, DrawingPath, DrawingRect, DrawingViewLayout } from './technical-drawing-layout.model';

@Component({
  selector: 'app-cabinet-technical-drawing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cabinet-technical-drawing.component.html',
  styleUrls: ['./cabinet-technical-drawing.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CabinetTechnicalDrawingComponent {
  readonly result = input<CabinetResponse | null>(null);

  protected readonly drawing = computed(() => buildTechnicalDrawingModel(this.result()?.boards));
  protected readonly layout = computed(() => {
    const model = this.drawing();
    return model ? buildTechnicalDrawingLayout(model) : null;
  });

  protected readonly trackByView = (_: number, view: DrawingViewLayout) => view.title;
  protected readonly trackByRect = (_: number, rect: DrawingRect) => `${rect.className}-${rect.x}-${rect.y}-${rect.label}`;
  protected readonly trackByPath = (_: number, path: DrawingPath) => `${path.className}-${path.d}`;
  protected readonly trackByLine = (_: number, line: DrawingLine) => `${line.className}-${line.x1}-${line.y1}-${line.x2}-${line.y2}`;
  protected readonly trackByNote = (index: number) => index;
}
