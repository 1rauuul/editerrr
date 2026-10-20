"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/dialog";
import type { Canvas } from "@/lib/model";
import { paintCanvas, saveCanvas } from "@/lib/render";
import { useEditor } from "@/lib/store";

export function CanvasCard({
  canvas,
  index,
  active,
}: {
  canvas: Canvas;
  index: number;
  active: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const format = useEditor((s) => s.format);
  const selections = useEditor((s) => s.selections);
  const photos = useEditor((s) => s.photos);
  const remove = useEditor((s) => s.remove);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current || !format) return;
    // La vista previa visible se dibuja desde el original; el resto, de la miniatura.
    void paintCanvas(ref.current, canvas, {
      format,
      first: index === 0,
      selections,
      photos,
      width: active ? 1080 : 360,
      source: active ? "full" : "thumb",
    });
  }, [active, canvas, format, index, selections, photos]);

  function deleteLeft() {
    setDeleting(false);
    remove(canvas.id, "left");
  }

  async function save() {
    if (!format) return;
    setSaving(true);
    try {
      await saveCanvas(canvas, { format, first: index === 0, selections, photos });
    } catch {
      setNotice("No se pudo guardar el lienzo. Inténtalo de nuevo.");
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
          onClick={() => setDeleting(true)}
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

      {deleting && (
        <Dialog
          title={`Eliminar el lienzo ${index + 1}`}
          message="Se eliminará el lienzo completo, incluida su mitad derecha. Las fotos siguen en los demás lienzos."
          onDismiss={() => setDeleting(false)}
          actions={[
            { label: "Cancelar", onClick: () => setDeleting(false) },
            { label: "Eliminar", danger: true, onClick: deleteLeft },
          ]}
        />
      )}

      {notice && (
        <Dialog
          title="No se pudo guardar"
          message={notice}
          onDismiss={() => setNotice(null)}
          actions={[{ label: "Entendido", primary: true, onClick: () => setNotice(null) }]}
        />
      )}
    </div>
  );
}
