"use client";

type Mode = "slides" | "stretch";

export function ModePicker({ onPick }: { onPick: (mode: Mode) => void }) {
  return (
    <div className="flex min-h-dvh flex-col justify-center bg-zinc-100 px-5 py-10 text-zinc-900">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">edtr</h1>
        <p className="mt-2 text-sm text-zinc-600">Elige qué quieres crear.</p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => onPick("slides")}
            className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 active:scale-[0.99]"
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
              <span className="flex h-10 w-8 overflow-hidden rounded-sm">
                <span className="h-full w-1/2 bg-zinc-400" />
                <span className="h-full w-1/2 bg-zinc-300" />
              </span>
            </span>
            <span>
              <span className="block text-base font-semibold">Slides</span>
              <span className="block text-sm text-zinc-500">Carrusel de fotos en dos mitades</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onPick("stretch")}
            className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-black/5 active:scale-[0.99]"
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-zinc-100">
              <span className="h-10 w-6 rounded-sm bg-zinc-400" />
            </span>
            <span>
              <span className="block text-base font-semibold">Stretch</span>
              <span className="block text-sm text-zinc-500">Estira una imagen 4:5 a 9:16</span>
            </span>
          </button>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-zinc-500">
          Las fotos se procesan en tu dispositivo y nunca se envían a un servidor.
        </p>
      </div>
    </div>
  );
}
