/**
 * Prymitywy SVG rysunków do oferty: samodzielny dokument (style w atrybutach, bez CSS strony), żeby po zamianie na
 * obraz wyglądał tak samo jak w przeglądarce. Rysunek jest w jednostkach widoku; rasteryzacja go skaluje.
 */

/** Rysunek gotowy do rasteryzacji: kod SVG i rozmiar w jednostkach widoku. */
export interface OfferSvgDrawing {
  svg: string;
  width: number;
  height: number;
}

/** Neutralna paleta do druku (odcienie szarości). */
export const PRINT = {
  ink: '#1f2937',
  line: '#334155',
  soft: '#64748b',
  faint: '#94a3b8',
  wall: '#f1f5f9',
  body: '#e2e8f0',
  front: '#ffffff',
  countertop: '#cbd5e1',
  plinth: '#94a3b8',
  appliance: '#e5e7eb',
  font: 'Arial, Helvetica, sans-serif'
} as const;

export interface SvgStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  dash?: string;
  opacity?: number;
}

export interface SvgTextStyle {
  size: number;
  anchor?: 'start' | 'middle' | 'end';
  weight?: 'normal' | 'bold';
  fill?: string;
  rotate?: number;
}

export function svgDocument(width: number, height: number, content: string[]): OfferSvgDrawing {
  const w = num(width);
  const h = num(height);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + `<rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>`
    + content.join('')
    + '</svg>';
  return { svg, width: Number(w), height: Number(h) };
}

/** Przesuwa grupę elementów o wektor (np. o marginesy rysunku). */
export function group(dx: number, dy: number, content: string[]): string {
  return `<g transform="translate(${num(dx)} ${num(dy)})">${content.join('')}</g>`;
}

export function rect(x: number, y: number, width: number, height: number, style: SvgStyle): string {
  if (width <= 0 || height <= 0) {
    return '';
  }
  return `<rect x="${num(x)}" y="${num(y)}" width="${num(width)}" height="${num(height)}"${styleAttributes(style)}/>`;
}

export function line(x1: number, y1: number, x2: number, y2: number, style: SvgStyle): string {
  return `<line x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}"`
    + `${styleAttributes({ ...style, fill: undefined })} stroke-linecap="round"/>`;
}

export function path(d: string, style: SvgStyle): string {
  return `<path d="${escapeXml(d)}"${styleAttributes(style)}/>`;
}

export function polygon(points: string, style: SvgStyle): string {
  return `<polygon points="${escapeXml(points)}"${styleAttributes(style)}/>`;
}

export function text(x: number, y: number, value: string, style: SvgTextStyle): string {
  const rotation = style.rotate ? ` transform="rotate(${num(style.rotate)} ${num(x)} ${num(y)})"` : '';
  return `<text x="${num(x)}" y="${num(y)}" font-family="${PRINT.font}" font-size="${num(style.size)}"`
    + ` font-weight="${style.weight ?? 'normal'}" fill="${style.fill ?? PRINT.ink}"`
    + ` text-anchor="${style.anchor ?? 'middle'}" dominant-baseline="middle"${rotation}>${escapeXml(value)}</text>`;
}

/**
 * Wymiar liniowy poziomy: linia wymiarowa z kreskami końcowymi i wartością nad linią (pomija odcinki zbyt krótkie,
 * żeby zmieścić liczbę).
 */
export function horizontalDimension(x1: number, x2: number, y: number, label: string, size: number): string[] {
  const length = x2 - x1;
  if (length <= 0) {
    return [];
  }
  const tick = size * 0.45;
  const style: SvgStyle = { stroke: PRINT.soft, strokeWidth: size * 0.07 };
  const elements = [
    line(x1, y, x2, y, style),
    line(x1, y - tick, x1, y + tick, style),
    line(x2, y - tick, x2, y + tick, style)
  ];
  if (length >= label.length * size * 0.62) {
    elements.push(text((x1 + x2) / 2, y - size * 0.75, label, { size, fill: PRINT.ink }));
  }
  return elements;
}

/** Wymiar liniowy pionowy z wartością obróconą wzdłuż linii (po lewej stronie). */
export function verticalDimension(x: number, y1: number, y2: number, label: string, size: number): string[] {
  const length = y2 - y1;
  if (length <= 0) {
    return [];
  }
  const tick = size * 0.45;
  const style: SvgStyle = { stroke: PRINT.soft, strokeWidth: size * 0.07 };
  return [
    line(x, y1, x, y2, style),
    line(x - tick, y1, x + tick, y1, style),
    line(x - tick, y2, x + tick, y2, style),
    text(x - size * 0.75, (y1 + y2) / 2, label, { size, rotate: -90 })
  ];
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Liczba w atrybucie SVG: najwyżej dwa miejsca po przecinku, bez zbędnych zer. */
export function num(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return String(Math.round(value * 100) / 100);
}

function styleAttributes(style: SvgStyle): string {
  const parts = [` fill="${style.fill ?? 'none'}"`];
  if (style.stroke) {
    parts.push(` stroke="${style.stroke}" stroke-width="${num(style.strokeWidth ?? 1)}"`);
  }
  if (style.dash) {
    parts.push(` stroke-dasharray="${style.dash}"`);
  }
  if (style.opacity !== undefined) {
    parts.push(` opacity="${num(style.opacity)}"`);
  }
  return parts.join('');
}
