"use client";

import { useEffect, useId, useRef } from "react";

export type DialogAction = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  primary?: boolean;
};

type Props = {
  title: string;
  message?: string;
  actions: DialogAction[];
  onDismiss?: () => void;
};

export function Dialog({ title, message, actions, onDismiss }: Props) {
  const first = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    first.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
      onClick={() => onDismiss?.()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-2xl bg-white p-5 text-zinc-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        {message && <p className="mt-2 text-sm leading-relaxed text-zinc-600">{message}</p>}
        <div className="mt-5 flex gap-2">
          {actions.map((action, index) => (
            <button
              key={action.label}
              ref={index === 0 ? first : undefined}
              type="button"
              onClick={action.onClick}
              className={`flex-1 rounded-full py-2.5 text-sm font-semibold ${
                action.danger
                  ? "bg-red-600 text-white"
                  : action.primary
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
