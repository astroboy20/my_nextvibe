export type ElementKind = 'text' | 'image' | 'sticker';

export interface CanvasElement {
  id: string;
  kind: ElementKind;
  // position (centre-based)
  x: number;
  y: number;
  // scale relative to natural size
  scale: number;
  // rotation in radians
  rotation: number;
  // text only
  text?: string;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  // image / sticker only
  uri?: string;         // local file:// URI or remote https://
  naturalW?: number;
  naturalH?: number;
}

export interface CanvasTemplate {
  id: string;
  name: string;
  category: string;
  /** Transparent PNG frame/overlay rendered on top of everything */
  frame: string;
  /** Preview image shown in the picker grid */
  mock: string;
}
