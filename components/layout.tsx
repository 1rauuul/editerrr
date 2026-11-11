"use client";

import { useEffect, useRef, useState } from "react";
import { CropModal } from "@/components/crop-modal";
import { Dialog } from "@/components/dialog";
import {
  FORMATS,
  LAYOUT_FORMATS,
  initialCrop,
  layoutBandRatio,
  layoutSize,
  repeatFirstBand,
  type Crop,
  type LayoutBands,
  type LayoutFormat,
  type Photo,
} from "@/lib/model";
import { makePhoto } from "@/lib/photo";
import { saveLayout } from "@/lib/render";

export function Layout({ onHome }: { onHome: () => void }) {
  const [format, setFormat] = useState<LayoutFormat | null>(null);
  const [bands, setBands] = useState<LayoutBands>(() => [null, null, null]);
  const [cropping, setCropping] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const target = useRef(0);
  const made = useRef(new Set<Photo>());

  useEffect(() => {
    const photos = made.current;
    return () => photos.forEach(revoke);
  }, []);

  if (!format) return <LayoutFormatPicker onPick={setFormat} onHome={onHome} />;

  const ratio = layoutBandRatio(format);
  const out = layoutSize(bands, format);
  const ready = bands.every((band) => band !== null);
  const locked = busy || saving;
  const editing = cropping !== null ? bands[cropping] ?? null : null;

  function pick(index: number) {
    target.current = index;
    input.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const index = target.current;
    setBusy(true);
    try {
      const photo = await makePhoto(file);
      made.current.add(photo);
      setBands((prev) =>
        prev.map((band, i) =>
          i === index
            ? { photo, crop: initialCrop(photo.width, photo.height, ratio) }
            : band,
        ),
      );
      setCropping(index);
    } catch {
      setNotice({
        title: "No se pudo leer la imagen",
        message: "La foto seleccionada no se pudo cargar.",
      });
    } finally {
      setBusy(false);
    }
  }

  function confirmCrop(index: number, crop: Crop) {
    setBands((prev) =>
      prev.map((band, i) => (i === index && band ? { ...band, crop } : band)),
    );
    setCropping(null);
  }

  async function save() {
    if (!format || !ready) return;
    setSaving(true);
    try {
      await saveLayout({ format, bands });
    } catch {
      setNotice({
        title: "No se pudo guardar",
        message: `No se pudo generar el JPEG ${format}. Inténtalo de nuevo.`,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-zinc-100/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={onHome}
            disabled={locked}
            aria-label="Volver al inicio"
            className="flex items-center gap-1 rounded-lg text-sm text-zinc-600 disabled:opacity-40"
          >
            <span className="text-lg">‹</span> Inicio
          </button>
          <span className="text-sm font-medium">Layout</span>
          <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white">
            {format}
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-32 pt-5">
        <div
          className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/10"
          style={{
            width: "min(72vw, 320px)",
            aspectRatio: `${FORMATS[format].w} / ${FORMATS[format].h}`,
          }}
        >
          {bands.map((band, index) => (
            <div key={index} className="relative min-h-0 flex-1 overflow-hidden bg-zinc-100">
              {band ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={band.photo.thumbUrl}
                    alt={`Franja ${index + 1}`}
                    className="pointer-events-none absolute select-none"
                    style={{
                      maxWidth: "none",
                      width: `${(band.photo.width / band.crop.w) * 100}%`,
                      height: `${(band.photo.height / band.crop.h) * 100}%`,
                      left: `${(-band.crop.x / band.crop.w) * 100}%`,
                      top: `${(-band.crop.y / band.crop.h) * 100}%`,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => pick(index)}
                    disabled={locked}
                    aria-label={`Cambiar foto de la franja ${index + 1}`}
                    className="absolute inset-0"
                  />
                  <button
                    type="button"
                    onClick={() => setCropping(index)}
                    disabled={locked}
                    className="absolute bottom-1.5 right-1.5 z-10 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                  >
                    Ajustar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => pick(index)}
                  disabled={locked}
                  className="flex h-full w-full items-center justify-center text-xs text-zinc-500 disabled:opacity-50"
                >
                  Toca para elegir foto
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="mt-3 max-w-xs text-center text-xs leading-relaxed text-zinc-500">
          Tres franjas con su propia foto y recorte. Se guardará a {out.width} × {out.height} px.
        </p>
        <p className="mt-1 max-w-xs text-center text-[11px] text-zinc-400">
          Toca una franja para cambiar su foto · Ajustar afina el encuadre
        </p>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto w-full max-w-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBands((prev) => repeatFirstBand(prev))}
              disabled={!bands[0] || locked}
              className="flex h-12 flex-1 items-center justify-center rounded-full bg-white text-sm font-semibold text-zinc-900 ring-1 ring-black/10 disabled:opacity-40"
            >
              Repetir en las 3
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!ready || locked}
              className="flex h-12 flex-[1.4] items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Guardando…" : `Guardar ${format}`}
            </button>
          </div>
          <input
            ref={input}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={locked}
            onChange={onFile}
          />
        </div>
      </div>

      {editing && cropping !== null && (
        <CropModal
          key={`${cropping}-${editing.photo.id}`}
          photo={editing.photo}
          ratio={ratio}
          startCrop={editing.crop}
          showSplit={false}
          title={`Ajusta la franja ${cropping + 1}`}
          onCancel={() => setCropping(null)}
          onConfirm={(crop) => confirmCrop(cropping, crop)}
        />
      )}

      {notice && (
        <Dialog
          title={notice.title}
          message={notice.message}
          onDismiss={() => setNotice(null)}
          actions={[{ label: "Entendido", primary: true, onClick: () => setNotice(null) }]}
        />
      )}
    </div>
  );
}

function LayoutFormatPicker({
  onPick,
  onHome,
}: {
  onPick: (format: LayoutFormat) => void;
  onHome: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col justify-center bg-zinc-100 px-5 py-10 text-zinc-900">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={onHome}
          className="mb-6 flex items-center gap-1 text-sm text-zinc-600"
        >
          <span className="text-lg">‹</span> Inicio
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">Elige el formato</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Se aplica a las tres franjas y no se puede cambiar después.
        </p>

        <div className="mt-6 space-y-3">
          {LAYOUT_FORMATS.map((key) => {
            const { w, h, label, hint } = FORMATS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => onPick(key)}
                className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 active:scale-[0.99]"
              >
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
                  <span
                    className="flex flex-col overflow-hidden rounded-sm"
                    style={{ width: 40 * (w / h), height: 40 }}
                  >
                    <span className="flex-1 bg-zinc-300" />
                    <span className="flex-1 bg-zinc-400" />
                    <span className="flex-1 bg-zinc-300" />
                  </span>
                </span>
                <span>
                  <span className="block text-base font-semibold">{label}</span>
                  <span className="block text-sm text-zinc-500">{hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-8 text-xs leading-relaxed text-zinc-500">
          Las fotos se procesan en tu dispositivo y nunca se envían a un servidor.
        </p>
      </div>
    </div>
  );
}

function revoke(photo: Photo) {
  URL.revokeObjectURL(photo.url);
  if (photo.thumbUrl !== photo.url) URL.revokeObjectURL(photo.thumbUrl);
}
