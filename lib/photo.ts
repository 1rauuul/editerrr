import { uid, type Photo } from "./model";

const cache = new Map<string, Promise<HTMLImageElement>>();

function decode(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = url;
  });
}

export function loadImage(url: string, cacheIt = true): Promise<HTMLImageElement> {
  if (!cacheIt) return decode(url);
  let pending = cache.get(url);
  if (!pending) {
    pending = decode(url);
    cache.set(url, pending);
  }
  return pending;
}

export function forgetImage(url: string) {
  cache.delete(url);
}

export function clearImageCache() {
  cache.clear();
}

// Se guarda solo una miniatura de 720 px para las vistas previas; la foto
// original se decodifica únicamente al guardar un lienzo.
export async function makePhoto(file: File): Promise<Photo> {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url, false);
  const scale = Math.min(1, 720 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const thumb = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  return {
    id: uid(),
    url,
    thumbUrl: thumb ? URL.createObjectURL(thumb) : url,
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}
