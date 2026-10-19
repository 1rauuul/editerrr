import {
  FORMATS,
  cropHalf,
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
  target.width = width;
  target.height = height;
  const ctx = target.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const halves: Array<{ inst: HalfInstance; left: boolean }> = [{ inst: canvas.left, left: true }];
  if (canvas.right) halves.push({ inst: canvas.right, left: false });

  for (const { inst, left } of halves) {
    const selection = opts.selections[inst.selectionId];
    const photo = selection && opts.photos[selection.photoId];
    if (!selection || !photo) continue;

    const url = opts.source === "thumb" ? photo.thumbUrl : photo.url;
    const img = await loadImage(url);
    try {
      const k = img.naturalWidth / photo.width;
      const c = selection.crop;
      const src = cropHalf(
        { x: c.x * k, y: c.y * k, w: c.w * k, h: c.h * k },
        halfForCanvas(opts.first, left),
      );
      ctx.drawImage(img, src.x, src.y, src.w, src.h, left ? 0 : width / 2, 0, width / 2, height);
    } finally {
      if (opts.source === "full") forgetImage(url);
    }
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
    width: FORMATS[opts.format].w,
    source: "full",
  });
  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("No se pudo generar el JPEG");

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
