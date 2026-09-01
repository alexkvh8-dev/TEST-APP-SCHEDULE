"use client";

import { useEffect, type ReactNode } from "react";

/**
 * The one bottom sheet every overlay in the app is built from — add, voice and
 * receipt all share it so they animate, scroll and dismiss identically.
 *
 * It caps its own height and scrolls internally: the numpad sheet is tall, and
 * a sheet that pushes past the viewport takes its primary button with it.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(10,10,8,0.5)" }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="rise relative w-full max-w-lg overflow-y-auto rounded-t-[28px] px-5 pt-4 sm:rounded-[28px]"
        style={{
          background: "var(--card)",
          maxHeight: "92dvh",
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div
          aria-hidden
          className="mx-auto mb-4 h-1 w-10 rounded-full sm:hidden"
          style={{ background: "var(--border)" }}
        />
        {children}
      </div>
    </div>
  );
}
