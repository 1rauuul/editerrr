export type Format = "4:5" | "1:1" | "9:16";

export const FORMATS: Record<Format, { w: number; h: number; label: string; hint: string }> = {
  "4:5": { w: 1080, h: 1350, label: "4:5", hint: "Feed de Instagram" },
  "1:1": { w: 1080, h: 1080, label: "1:1", hint: "Publicación cuadrada" },
  "9:16": { w: 1080, h: 1920, label: "9:16", hint: "Historias y TikTok" },
};

export const MAX_CANVASES = 35;

export type Crop = { x: number; y: number; w: number; h: number };

export type Photo = {
  id: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
};

export type Selection = { id: string; photoId: string; crop: Crop };
export type HalfInstance = { id: string; selectionId: string };
export type Canvas = { id: string; left: HalfInstance; right: HalfInstance | null };

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function ratioOf(format: Format) {
  return FORMATS[format].w / FORMATS[format].h;
}

// Al agregar una foto se completa la derecha vacía del último lienzo y siempre
// se abre uno nuevo con la foto como cabeza. La cadena rota no se repara.
export function appendPhoto(canvases: Canvas[], selectionId: string): Canvas[] {
  const next = canvases.slice();
  const last = next[next.length - 1];
  if (last && last.right === null) {
    next[next.length - 1] = { ...last, right: { id: uid(), selectionId } };
  }
  next.push({ id: uid(), left: { id: uid(), selectionId }, right: null });
  return next;
}

export function removeHalf(canvases: Canvas[], canvasId: string, side: "left" | "right"): Canvas[] {
  if (side === "left") return canvases.filter((c) => c.id !== canvasId);
  return canvases.map((c) => (c.id === canvasId ? { ...c, right: null } : c));
}

// Región más grande con la proporción del lienzo que cabe en la foto.
export function initialCrop(imgW: number, imgH: number, ratio: number): Crop {
  let w = imgW;
  let h = w / ratio;
  if (h > imgH) {
    h = imgH;
    w = h * ratio;
  }
  return { x: (imgW - w) / 2, y: (imgH - h) / 2, w, h };
}

export function clampCrop(c: Crop, imgW: number, imgH: number): Crop {
  return {
    ...c,
    x: Math.min(Math.max(c.x, 0), Math.max(0, imgW - c.w)),
    y: Math.min(Math.max(c.y, 0), Math.max(0, imgH - c.h)),
  };
}

// La aparición a la derecha muestra la mitad izquierda del recorte y la
// aparición a la izquierda la derecha, salvo la cabeza del primer lienzo.
export function halfForCanvas(isFirstCanvas: boolean, isLeftHalf: boolean): "left" | "right" {
  return !isLeftHalf || isFirstCanvas ? "left" : "right";
}

export function cropHalf(crop: Crop, half: "left" | "right"): Crop {
  return { x: crop.x + (half === "right" ? crop.w / 2 : 0), y: crop.y, w: crop.w / 2, h: crop.h };
}
