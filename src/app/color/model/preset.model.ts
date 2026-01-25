export interface Preset {
  id: string;
  name: string;
  baseHex?: string;
  textureUrl?: string;
  thumbnailUrl?: string;
  isTileable?: boolean;
  repeat?: { x: number; y: number };
}
