import { escapeXml, horizontalDimension, num, rect, svgDocument, text, verticalDimension } from './offer-svg';

describe('offer-svg — prymitywy rysunków oferty', () => {
  it('dokument SVG ma wymiary, białe tło i zawartość', () => {
    const drawing = svgDocument(120.456, 80, ['<g/>']);

    expect(drawing.width).toBe(120.46);
    expect(drawing.height).toBe(80);
    expect(drawing.svg).toContain('viewBox="0 0 120.46 80"');
    expect(drawing.svg).toContain('fill="#ffffff"');
    expect(drawing.svg).toContain('<g/>');
    expect(new DOMParser().parseFromString(drawing.svg, 'image/svg+xml').querySelector('parsererror')).toBeNull();
  });

  it('prostokąt o zerowym rozmiarze nie jest rysowany', () => {
    expect(rect(0, 0, 0, 10, { fill: '#000' })).toBe('');
    expect(rect(0, 0, 10, 10, { fill: '#000', dash: '2 1' })).toContain('stroke-dasharray="2 1"');
  });

  it('tekst jest escapowany, a liczby mają najwyżej dwa miejsca po przecinku', () => {
    expect(escapeXml('A & B <"C">')).toBe('A &amp; B &lt;&quot;C&quot;&gt;');
    expect(text(1, 2, 'Ściana <1>', { size: 12 })).toContain('>Ściana &lt;1&gt;</text>');
    expect(num(1.236)).toBe('1.24');
    expect(num(12.5)).toBe('12.5');
    expect(num(Number.NaN)).toBe('0');
  });

  it('wymiar poziomy ma linię, kreski końcowe i wartość, a za krótki odcinek — bez wartości', () => {
    expect(horizontalDimension(0, 100, 10, '600', 12).join('')).toContain('>600</text>');
    expect(horizontalDimension(0, 10, 10, '600', 12).join('')).not.toContain('<text');
    expect(horizontalDimension(10, 10, 10, '600', 12)).toEqual([]);
  });

  it('wymiar pionowy ma wartość obróconą wzdłuż linii', () => {
    const elements = verticalDimension(-20, 0, 200, '2600', 12).join('');

    expect(elements).toContain('>2600</text>');
    expect(elements).toContain('rotate(-90');
  });
});
