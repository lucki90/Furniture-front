import { TechnicalDrawingModel } from './technical-drawing.model';

export interface DrawingRect {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  className: string;
  label: string;
  selectable?: boolean;
  dimensionLabel?: string;
}

export interface DrawingPath {
  d: string;
  className: string;
  label: string;
}

export interface DrawingLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  className: string;
}

export interface DrawingText {
  x: number;
  y: number;
  value: string;
  className: string;
  textAnchor?: 'start' | 'middle' | 'end';
}

export interface DrawingViewLayout {
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  titleX: number;
  titleY: number;
  rects: DrawingRect[];
  paths: DrawingPath[];
  lines: DrawingLine[];
  texts: DrawingText[];
  widthLabel: string;
  widthLabelX: number;
  widthLabelY: number;
  heightLabel: string;
  heightLabelX: number;
  heightLabelY: number;
  heightLabelTransform: string;
}

export interface TechnicalDrawingLayout {
  svgWidth: number;
  svgHeight: number;
  model: TechnicalDrawingModel;
  confidenceClass: string;
  confidenceLabel: string;
  front: DrawingViewLayout;
  side: DrawingViewLayout;
  top: DrawingViewLayout;
  views: DrawingViewLayout[];
}
