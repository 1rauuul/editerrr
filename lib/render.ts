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

type Layer = { img: HTMLImageElement; src: ReturnType<typeof cropHalf>; left: boolean; release: string | null };

async function tryLoad(url: string) {
  try {
    return await loadImage(url);
  } catch {
    return null;
  }
}

export async function paintCanvas(
  target: HTMLCanvasElement,
  canvas: Canvas,
  opts: PaintOptions,
): Promise<boolean> {
  const { w, h } = FORMATS[opts.format];
  const width = opts.width;
  const height = Math.round((width * h) / w);

  const halves: Array<{ inst: HalfInstance; left: boolean }> = [{ inst: canvas.left, left: true }];
  if (canvas.right) halves.push({ inst: canvas.right, left: false });

  const layers: Layer[] = [];

  for (const { inst, left } of halves) {
    const selection = opts.selections[inst.selectionId];
    const photo = selection && opts.photos[selection.photoId];
    if (!selection || !photo) continue;

    const primary = opts.source === "thumb" ? photo.thumbUrl : photo.url;
    let img = await tryLoad(primary);
    let used = primary;

    // Si el original no se puede decodificar (móviles con poca memoria) se usa la
    // miniatura: mejor una imagen algo blanda que un lienzo en blanco.
    if (!img && primary !== photo.thumbUrl) {
      img = await tryLoad(photo.thumbUrl);
      used = photo.thumbUrl;
    }
    if (!img) continue;

    const k = img.naturalWidth / photo.width;
    const c = selection.crop;
    layers.push({
      img,
      src: cropHalf({ x: c.x * k, y: c.y * k, w: c.w * k, h: c.h * k }, halfForCanvas(opts.first, left)),
      left,
      release: opts.source === "full" && used === photo.url ? used : null,
    });
  }

  if (!layers.length) return false;

  target.width = width;
  target.height = height;
  const ctx = target.getContext("2d");
  if (!ctx) return false;

  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  for (const layer of layers) {
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
    if (layer.release) forgetImage(layer.release);
  }

  return true;
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
  const painted = await paintCanvas(out, canvas, {
    ...opts,
    width: exportWidth(canvas, opts.selections, opts.photos),
    source: "full",
  });
  if (!painted) throw new Error("No se pudieron cargar las fotos del lienzo");
  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("No se pudo generar el JPEG");
  await deliver(blob, fileName());
}

// En iOS el atributo download no funciona en la PWA ni en el navegador, así que
// se usa la hoja nativa. En Android y escritorio se descarga directamente.
async function deliver(blob: Blob, name: string) {
  const file = new File([blob], name, { type: "image/jpeg" });

  if (isIOS() && navigator.canShare?.({ files: [file] })) {
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

function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
