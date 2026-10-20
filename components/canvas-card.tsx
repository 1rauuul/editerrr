"use client";

import { useEffect, useRef, useState } from "react";
import type { Canvas } from "@/lib/model";
import { paintCanvas, saveCanvas } from "@/lib/render";
import { useEditor } from "@/lib/store";

export function CanvasCard({ canvas, index }: { canvas: Canvas; index: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const format = useEditor((s) => s.format);
  const selections = useEditor((s) => s.selections);
  const photos = useEditor((s) => s.photos);
  const remove = useEditor((s) => s.remove);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ref.current || !format) return;
    void paintCanvas(ref.current, canvas, {
      format,
      first: index === 0,
      selections,
      photos,
      width: 360,
      source: "thumb",
    });
  }, [canvas, format, index, selections, photos]);

  function deleteLeft() {
    if (
      confirm(
        `Se eliminará el lienzo ${index + 1} completo, incluida su mitad derecha. Las fotos siguen en los demás lienzos. ¿Continuar?`,
      )
    ) {
      remove(canvas.id, "left");
    }
  }

  async function save() {
    if (!format) return;
    setSaving(true);
    try {
      await saveCanvas(canvas, { format, first: index === 0, selections, photos });
    } catch {
      alert("No se pudo guardar el lienzo. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/10">
        <canvas ref={ref} className="block w-full" />
        {!canvas.right && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex w-1/2 items-center justify-center bg-white/90 text-xs font-medium text-zinc-400 ring-1 ring-inset ring-black/5">
            vacío
          </div>
        )}
        <button
          type="button"
          onClick={deleteLeft}
          aria-label={`Eliminar el lienzo ${index + 1}`}
          className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-lg leading-none text-zinc-700 shadow ring-1 ring-black/10"
        >
          ×
        </button>
        {canvas.right && (
          <button
            type="button"
            onClick={() => remove(canvas.id, "right")}
            aria-label={`Quitar la mitad derecha del lienzo ${index + 1}`}
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-lg leading-none text-zinc-700 shadow ring-1 ring-black/10"
          >
            ×
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between px-1">
        <span className="text-xs text-zinc-500">Lienzo {index + 1}</span>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
