"use client";

import { useEffect, useState } from "react";
import { CropModal } from "@/components/crop-modal";
import { Dialog } from "@/components/dialog";
import { initialCrop, ratioOf, stretchSize, type Crop, type Photo } from "@/lib/model";
import { makePhoto } from "@/lib/photo";
import { saveStretch } from "@/lib/render";

export function Stretch({ onHome }: { onHome: () => void }) {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [cropping, setCropping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (!photo) return;
    return () => revoke(photo);
  }, [photo]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    try {
      const next = await makePhoto(file);
      setPhoto(next);
      setCrop(initialCrop(next.width, next.height, ratioOf("4:5")));
      setCropping(true);
    } catch {
      setNotice({
        title: "No se pudo leer la imagen",
        message: "La foto seleccionada no se pudo cargar.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!photo || !crop) return;
    setSaving(true);
    try {
      await saveStretch(photo, crop);
    } catch {
      setNotice({
        title: "No se pudo guardar",
        message: "No se pudo generar el JPEG 9:16. Inténtalo de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  }

  const out = crop ? stretchSize(crop.w) : null;
  const locked = busy || saving;

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
          <span className="text-sm font-medium">Stretch</span>
          <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white">
            9:16
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-32 pt-5">
        {photo && crop ? (
          <>
            <div
              className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/10"
              style={{ width: "min(78vw, 340px)", aspectRatio: "9 / 16" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbUrl}
                alt="Vista previa estirada a 9:16"
                className="pointer-events-none absolute select-none"
                style={{
                  maxWidth: "none",
                  width: `${(photo.width / crop.w) * 100}%`,
                  height: `${(photo.height / crop.h) * 100}%`,
                  left: `${(-crop.x / crop.w) * 100}%`,
                  top: `${(-crop.y / crop.h) * 100}%`,
                }}
              />
            </div>
            <p className="mt-3 max-w-xs text-center text-xs leading-relaxed text-zinc-500">
              Se estira la sección 4:5 elegida al 9:16.
              {out ? ` Se guardará a ${out.width} × ${out.height} px.` : ""}
            </p>
            <button
              type="button"
              onClick={() => setCropping(true)}
              disabled={locked}
              className="mt-3 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 ring-1 ring-black/10 disabled:opacity-50"
            >
              Ajustar recorte 4:5
            </button>
          </>
        ) : (
          <p className="max-w-xs text-center text-sm text-zinc-600">
            Elige una imagen y ajusta su sección 4:5 para convertirla a 9:16.
          </p>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto w-full max-w-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          {photo ? (
            <div className="flex gap-2">
              <label
                className={`flex h-12 flex-1 items-center justify-center rounded-full text-sm font-semibold ${
                  locked ? "bg-zinc-200 text-zinc-500" : "bg-white text-zinc-900 ring-1 ring-black/10"
                }`}
              >
                {busy ? "Procesando…" : "Cambiar foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={locked}
                  onChange={onFile}
                />
              </label>
              <button
                type="button"
                onClick={save}
                disabled={locked}
                className="flex h-12 flex-[1.4] items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar 9:16"}
              </button>
            </div>
          ) : (
            <label
              className={`flex h-12 items-center justify-center rounded-full text-sm font-semibold ${
                busy ? "bg-zinc-300 text-zinc-600" : "bg-zinc-900 text-white"
              }`}
            >
              {busy ? "Procesando…" : "Elegir foto"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={busy}
                onChange={onFile}
              />
            </label>
          )}
        </div>
      </div>

      {cropping && photo && crop && (
        <CropModal
          key={photo.id}
          photo={photo}
          ratio={ratioOf("4:5")}
          startCrop={crop}
          showSplit={false}
          title="Ajusta el recorte 4:5"
          previewRatio={ratioOf("9:16")}
          onCancel={() => setCropping(false)}
          onConfirm={(next) => {
            setCrop(next);
            setCropping(false);
          }}
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

function revoke(photo: Photo) {
  URL.revokeObjectURL(photo.url);
  if (photo.thumbUrl !== photo.url) URL.revokeObjectURL(photo.thumbUrl);
}
