"use client";

import { useEffect, useRef, useState } from "react";
import { CanvasCard } from "@/components/canvas-card";
import { CropModal } from "@/components/crop-modal";
import { FORMATS, MAX_CANVASES, ratioOf, type Format, type Photo } from "@/lib/model";
import { makePhoto } from "@/lib/photo";
import { useEditor } from "@/lib/store";

export default function Editor() {
  const format = useEditor((s) => s.format);
  const chooseFormat = useEditor((s) => s.chooseFormat);
  const canvases = useEditor((s) => s.canvases);
  const addPhoto = useEditor((s) => s.addPhoto);
  const reset = useEditor((s) => s.reset);
  const [queue, setQueue] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [slide, setSlide] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const previousCount = useRef(0);

  useEffect(() => {
    if (!canvases.length) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [canvases.length]);

  // Al agregar una foto, la vista salta al lienzo nuevo.
  useEffect(() => {
    const el = scroller.current;
    if (el && canvases.length > previousCount.current && canvases.length > 0) {
      el.scrollTo({ left: el.clientWidth * (canvases.length - 1), behavior: "smooth" });
    }
    previousCount.current = canvases.length;
  }, [canvases.length]);

  if (!format) return <FormatPicker onPick={chooseFormat} />;

  const capacity = MAX_CANVASES - canvases.length;
  const ratio = ratioOf(format);
  const current = Math.min(slide, canvases.length - 1);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    setSlide(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(index: number) {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({
      left: el.clientWidth * Math.max(0, Math.min(canvases.length - 1, index)),
      behavior: "smooth",
    });
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const take = files.slice(0, capacity);
    if (take.length < files.length) {
      alert(`Solo caben ${capacity} foto(s) más: el máximo es ${MAX_CANVASES} lienzos.`);
    }
    if (!take.length) return;

    setBusy(true);
    try {
      const made: Photo[] = [];
      for (const file of take) made.push(await makePhoto(file));
      setQueue((q) => [...q, ...made]);
    } catch {
      alert("No se pudo leer alguna de las imágenes.");
    } finally {
      setBusy(false);
    }
  }

  function newProject() {
    if (canvases.length && !confirm("Se descartará el proyecto actual y las fotos cargadas. ¿Continuar?")) {
      return;
    }
    setQueue([]);
    reset();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-zinc-100/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold tracking-tight">edtr</span>
          <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white">
            {format}
          </span>
          <button type="button" onClick={newProject} className="text-sm text-zinc-600">
            Nuevo
          </button>
        </div>
      </header>

      <main className="flex-1 pb-32 pt-5">
        {canvases.length ? (
          <>
            <div
              ref={scroller}
              onScroll={onScroll}
              className="mx-auto flex w-full max-w-md snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {canvases.map((canvas, index) => (
                <div key={canvas.id} data-slide={index} className="w-full shrink-0 snap-center px-4">
                  <CanvasCard canvas={canvas} index={index} />
                </div>
              ))}
            </div>
            <div className="mx-auto mt-4 flex w-full max-w-md items-center justify-center gap-6">
              <button
                type="button"
                onClick={() => goTo(current - 1)}
                disabled={current <= 0}
                aria-label="Lienzo anterior"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg text-zinc-700 shadow-sm ring-1 ring-black/10 disabled:opacity-30"
              >
                ‹
              </button>
              <span className="text-xs tabular-nums text-zinc-500">
                {current + 1} / {canvases.length}
              </span>
              <button
                type="button"
                onClick={() => goTo(current + 1)}
                disabled={current >= canvases.length - 1}
                aria-label="Lienzo siguiente"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg text-zinc-700 shadow-sm ring-1 ring-black/10 disabled:opacity-30"
              >
                ›
              </button>
            </div>
          </>
        ) : (
          <p className="mx-auto mt-24 max-w-md px-4 text-center text-sm text-zinc-600">
            Agrega la primera foto para crear el lienzo 1.
          </p>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto w-full max-w-md px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          {capacity > 0 ? (
            <label
              className={`flex h-12 items-center justify-center rounded-full text-sm font-semibold ${
                busy ? "bg-zinc-300 text-zinc-600" : "bg-zinc-900 text-white"
              }`}
            >
              {busy ? "Procesando…" : "Agregar foto"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={busy}
                onChange={onFiles}
              />
            </label>
          ) : (
            <p className="py-3 text-center text-sm text-zinc-500">
              Límite alcanzado: {MAX_CANVASES} lienzos.
            </p>
          )}
        </div>
      </div>

      {queue[0] && (
        <CropModal
          key={queue[0].id}
          photo={queue[0]}
          ratio={ratio}
          onCancel={() => setQueue((q) => q.slice(1))}
          onConfirm={(crop) => {
            addPhoto(queue[0], crop);
            setQueue((q) => q.slice(1));
          }}
        />
      )}
    </div>
  );
}

function FormatPicker({ onPick }: { onPick: (format: Format) => void }) {
  return (
    <div className="flex min-h-dvh flex-col justify-center bg-zinc-100 px-5 py-10 text-zinc-900">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">Elige el formato</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Se aplica a todos los lienzos y no se puede cambiar después.
        </p>

        <div className="mt-6 space-y-3">
          {(Object.keys(FORMATS) as Format[]).map((key) => {
            const { w, h, label, hint } = FORMATS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => onPick(key)}
                className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 active:scale-[0.99]"
              >
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
                  <span className="rounded-sm bg-zinc-400" style={{ width: 40 * (w / h), height: 40 }} />
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
          Las fotos se procesan en tu dispositivo y nunca se envían a un servidor. Si cierras la app
          antes de guardar, el proyecto se pierde.
        </p>
      </div>
    </div>
  );
}
