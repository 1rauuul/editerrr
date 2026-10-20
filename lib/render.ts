import {
  FORMATS,
  cropHalf,
  exportWidth,
  halfForCanvas,
  type Canvas,
  type Format,
  type HalfInstance,
  type Photo,
  type Selection,
} from "./model";
import { forgetImage, loadImage } from "./photo";

export type PaintOptions = {
  format: Format;
  first: boolean;
  selections: Record<string, Selection>;
  photos: Record<string, Photo>;
  width: number;
  source: "thumb" | "full";
};

export async function paintCanvas(target: HTMLCanvasElement, canvas: Canvas, opts: PaintOptions) {
  const { w, h } = FORMATS[opts.format];
  const width = opts.width;
  const height = Math.round((width * h) / w);

  const halves: Array<{ inst: HalfInstance; left: boolean }> = [{ inst: canvas.left, left: true }];
  if (canvas.right) halves.push({ inst: canvas.right, left: false });

  // Las imágenes se cargan antes de tocar el canvas: así no parpadea en blanco
  // mientras se decodifica el original.
  const layers = await Promise.all(
    halves.map(async ({ inst, left }) => {
      const selection = opts.selections[inst.selectionId];
      const photo = selection && opts.photos[selection.photoId];
      if (!selection || !photo) return null;

      const url = opts.source === "thumb" ? photo.thumbUrl : photo.url;
      try {
        const img = await loadImage(url);
        const k = img.naturalWidth / photo.width;
        const c = selection.crop;
        const src = cropHalf(
          { x: c.x * k, y: c.y * k, w: c.w * k, h: c.h * k },
          halfForCanvas(opts.first, left),
        );
        return { img, src, left, url: opts.source === "full" ? url : null };
      } catch {
        return null;
      }
    }),
  );

  target.width = width;
  target.height = height;
  const ctx = target.getContext("2d");
  if (!ctx) return;

  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  for (const layer of layers) {
    if (!layer) continue;
    ctx.drawImage(
      layer.img,
      layer.src.x,
      layer.src.y,
      layer.src.w,
      layer.src.h,
      layer.left ? 0 : width / 2,
      0,
      width / 2,
      height,
    );
    if (layer.url) forgetImage(layer.url);
  }
}

export function fileName(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).padEnd(4, "0");
  return `edtr-${dd}${mm}-${rand}.jpg`;
}

export async function saveCanvas(
  canvas: Canvas,
  opts: Omit<PaintOptions, "width" | "source">,
) {
  const out = document.createElement("canvas");
  await paintCanvas(out, canvas, {
    ...opts,
    width: exportWidth(canvas, opts.selections, opts.photos),
    source: "full",
  });
  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("No se pudo generar el JPEG");
  await deliver(blob, fileName());
}

// En móvil se comparte desde la hoja nativa (guardar en Fotos/Files, Instagram…);
// el atributo download no funciona en la PWA de iOS ni en varios navegadores in-app.
async function deliver(blob: Blob, name: string) {
  const file = new File([blob], name, { type: "image/jpeg" });
  const touch = window.matchMedia?.("(pointer: coarse)").matches ?? false;

  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      if ((error as DOMException).name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
