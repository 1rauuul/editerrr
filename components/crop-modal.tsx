"use client";

import { useMemo, useRef, useState } from "react";
import { clampCrop, initialCrop, type Crop, type Photo } from "@/lib/model";

type Props = {
  photo: Photo;
  ratio: number;
  onCancel: () => void;
  onConfirm: (crop: Crop) => void;
};

export function CropModal({ photo, ratio, onCancel, onConfirm }: Props) {
  const base = useMemo(() => initialCrop(photo.width, photo.height, ratio), [photo, ratio]);
  const [crop, setCrop] = useState<Crop>(base);
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; crop: Crop } | null>(null);
  const pinch = useRef<{ dist: number; mx: number; my: number; crop: Crop } | null>(null);

  const minW = Math.min(base.w, Math.max(base.w / 4, 120));
  const zoom = Math.min(4, Math.max(1, base.w / crop.w));

  function zoomTo(value: number) {
    const w = Math.min(base.w, Math.max(minW, base.w / value));
    const h = w / ratio;
    const cx = crop.x + crop.w / 2;
    const cy = crop.y + crop.h / 2;
    setCrop(clampCrop({ x: cx - w / 2, y: cy - h / 2, w, h }, photo.width, photo.height));
  }

  function down(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      drag.current = { x: e.clientX, y: e.clientY, crop };
      pinch.current = null;
    } else if (pointers.current.size === 2) {
      drag.current = null;
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
        crop,
      };
    }
  }

  function move(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const p = pinch.current;
      const u = (p.mx - box.left) / box.width;
      const v = (p.my - box.top) / box.height;
      const fixedX = p.crop.x + u * p.crop.w;
      const fixedY = p.crop.y + v * p.crop.h;
      const w = Math.min(base.w, Math.max(minW, (p.crop.w * p.dist) / dist));
      const h = w / ratio;
      setCrop(clampCrop({ x: fixedX - u * w, y: fixedY - v * h, w, h }, photo.width, photo.height));
    } else if (drag.current) {
      const d = drag.current;
      const dx = ((e.clientX - d.x) / box.width) * d.crop.w;
      const dy = ((e.clientY - d.y) / box.height) * d.crop.h;
      setCrop(clampCrop({ ...d.crop, x: d.crop.x - dx, y: d.crop.y - dy }, photo.width, photo.height));
    }
  }

  function up(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 1) {
      const [p] = [...pointers.current.values()];
      drag.current = { x: p.x, y: p.y, crop };
    } else {
      drag.current = null;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={onCancel} className="rounded-lg px-2 py-1 text-sm text-white/70">
          Cancelar
        </button>
        <p className="text-sm font-medium">Ajusta el encuadre</p>
        <button
          type="button"
          onClick={() => onConfirm(crop)}
          className="rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-zinc-900"
        >
          Listo
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div
          ref={frame}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="relative touch-none select-none overflow-hidden bg-white"
          style={{ width: "min(92vw, 380px)", aspectRatio: String(ratio) }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.thumbUrl}
            alt=""
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{
              maxWidth: "none",
              width: `${(photo.width / crop.w) * 100}%`,
              height: `${(photo.height / crop.h) * 100}%`,
              left: `${(-crop.x / crop.w) * 100}%`,
              top: `${(-crop.y / crop.h) * 100}%`,
            }}
          />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-white/80 mix-blend-difference" />
        </div>
      </div>

      <div className="px-6 pb-8 pt-2">
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={(e) => zoomTo(Number(e.target.value))}
          className="w-full accent-white"
          aria-label="Zoom"
        />
        <p className="mt-3 text-center text-xs text-white/50">
          Arrastra para mover · Pellizca o usa el control para ampliar
        </p>
      </div>
    </div>
  );
}
