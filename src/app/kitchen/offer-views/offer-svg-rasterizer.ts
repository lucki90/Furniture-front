import { OfferSvgDrawing } from './offer-svg';

/** Dłuższy bok obrazu PNG (px): ostry wydruk rysunku na szerokość strony A4 przy rozsądnym rozmiarze pliku. */
export const OFFER_VIEW_MAX_SIDE_PX = 2000;

/**
 * Zamienia rysunek SVG na obraz PNG zakodowany w Base64 (bez prefiksu `data:`). Rysunek jest skalowany tak, żeby
 * dłuższy bok miał {@link OFFER_VIEW_MAX_SIDE_PX}; tło jest białe.
 */
export async function rasterizeSvgToPngBase64(drawing: OfferSvgDrawing): Promise<string> {
  const scale = OFFER_VIEW_MAX_SIDE_PX / Math.max(drawing.width, drawing.height, 1);
  const width = Math.max(1, Math.round(drawing.width * scale));
  const height = Math.max(1, Math.round(drawing.height * scale));
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawing.svg)}`);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Przeglądarka nie udostępnia rysowania na canvas.');
  }
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Nie udało się wczytać rysunku SVG.'));
    image.src = source;
  });
}
