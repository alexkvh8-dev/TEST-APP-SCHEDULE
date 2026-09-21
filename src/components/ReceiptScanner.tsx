"use client";

import { useEffect, useRef, useState } from "react";

import { Sheet } from "@/components/Sheet";
import { currencyMeta, formatMoney } from "@/lib/currency";
import type { Expense, NeedLevel } from "@/lib/types";

/**
 * The Android shell installs this. It is absent in a browser, which is the
 * signal to fall back to a plain file input.
 */
declare global {
  interface Window {
    FinXNative?: { takePhoto?: () => void; hasCamera?: () => boolean };
    /** Called by the shell with a JPEG data URL, or null if nothing was taken. */
    __finxCameraResult?: (dataUrl: string | null) => void;
  }
}

interface Line {
  item: string;
  amount: number;
  category: string | null;
  need_level: NeedLevel;
  keep: boolean;
}

/** Photos off a phone are 4-8 MB; the reader needs far less than that. */
const MAX_EDGE = 1400;
const QUALITY = 0.82;

function dataUrlToFile(dataUrl: string, filename: string): File {
  const comma = dataUrl.indexOf(",");
  const mime = /:(.*?);/.exec(dataUrl.slice(0, comma))?.[1] ?? "image/jpeg";
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

async function downscale(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that image");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", QUALITY);
}

/**
 * One photo, many entries.
 *
 * A receipt is a list of separate decisions, and rolling it into a single
 * "Groceries 8,400" line hides all of them. Every line comes back editable and
 * individually droppable, because a misread line in the ledger is worse than
 * no line at all.
 */
export function ReceiptScanner({
  open,
  onClose,
  onSaved,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (expenses: Expense[], statement: string | null) => void;
  currency: string;
}) {
  const [busy, setBusy] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[] | null>(null);
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  function reset() {
    setLines(null);
    setMerchant(null);
    setError(null);
    setCapturing(false);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const image = await downscale(file);
      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not read that receipt");

      const parsed = (body.items ?? []) as Omit<Line, "keep">[];
      if (!parsed.length) throw new Error("No line items found on that receipt.");

      setMerchant(body.merchant ?? null);
      setLines(parsed.map((line) => ({ ...line, keep: true })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that receipt");
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  }

  /*
   * The shell calls back on its own schedule, long after this render. The ref
   * keeps the callback pointed at the current handleFile without tearing the
   * registration down and rebuilding it every keystroke.
   */
  const handleFileRef = useRef(handleFile);
  useEffect(() => {
    handleFileRef.current = handleFile;
  });

  useEffect(() => {
    window.__finxCameraResult = (dataUrl: string | null) => {
      setCapturing(false);
      if (!dataUrl) return;
      try {
        void handleFileRef.current(dataUrlToFile(dataUrl, "receipt.jpg"));
      } catch {
        setError("Could not read that photo. Try again, or pick it from your gallery.");
      }
    };
    return () => {
      delete window.__finxCameraResult;
    };
  }, []);

  /**
   * In the Android app the camera gets its own native path — routing it through
   * a file input meant going via the system chooser, which is where captures
   * were being lost. In a browser the capture-hinted input is still the right
   * answer.
   */
  function takePhoto() {
    setError(null);
    const native = typeof window !== "undefined" ? window.FinXNative : undefined;
    if (typeof native?.takePhoto === "function") {
      setCapturing(true);
      try {
        native.takePhoto();
        return;
      } catch {
        setCapturing(false);
      }
    }
    cameraRef.current?.click();
  }

  function update(index: number, patch: Partial<Line>) {
    setLines((prev) =>
      prev ? prev.map((line, i) => (i === index ? { ...line, ...patch } : line)) : prev,
    );
  }

  const kept = lines?.filter((l) => l.keep) ?? [];
  const total = kept.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  async function save() {
    if (!kept.length) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "receipt",
          items: kept.map((line) => ({
            item: merchant ? `${line.item} · ${merchant}` : line.item,
            amount: Number(line.amount),
            currency,
            category: line.category,
            need_level: line.need_level,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not save those");

      onSaved((body.expenses ?? []) as Expense[], body.statement ?? null);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save those");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      label="Scan a receipt"
    >
      <h2 className="text-base font-bold">
        {lines ? "Check the split" : "Scan a receipt"}
      </h2>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        {lines
          ? "Every line saves as its own entry. Drop the ones you did not pay for."
          : "One photo becomes one entry per line — not a single lump sum."}
      </p>

      {error && (
        <p className="mt-3 text-sm font-medium" style={{ color: "var(--critical)" }} role="alert">
          {error}
        </p>
      )}

      {!lines && (
        <div className="my-6 flex flex-col items-center gap-4">
          <div
            className="flex size-24 items-center justify-center rounded-full"
            style={{ background: busy ? "var(--lime)" : "var(--field)" }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke={busy ? "var(--lime-ink)" : "var(--muted)"}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M4 8V6a2 2 0 0 1 2-2h2m8 0h2a2 2 0 0 1 2 2v2m0 8v2a2 2 0 0 1-2 2h-2m-8 0H6a2 2 0 0 1-2-2v-2M7 12h10" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: "var(--muted)" }} aria-live="polite">
            {busy
              ? "Reading the receipt…"
              : capturing
                ? "Camera is open — take the shot."
                : "Good light, whole receipt in frame."}
          </p>
        </div>
      )}

      {lines && (
        <>
          <ul className="my-4 flex flex-col gap-2">
            {lines.map((line, index) => (
              <li
                key={index}
                className="flex items-center gap-2 rounded-2xl px-3 py-2.5"
                style={{ background: "var(--field)", opacity: line.keep ? 1 : 0.45 }}
              >
                <input
                  type="checkbox"
                  checked={line.keep}
                  onChange={(e) => update(index, { keep: e.target.checked })}
                  aria-label={`Keep ${line.item}`}
                  className="size-5 shrink-0"
                  style={{ accentColor: "var(--ink)" }}
                />
                <input
                  value={line.item}
                  onChange={(e) => update(index, { item: e.target.value })}
                  aria-label="Item name"
                  maxLength={200}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "var(--ink)" }}
                />
                <button
                  type="button"
                  onClick={() =>
                    update(index, { need_level: line.need_level === "need" ? "want" : "need" })
                  }
                  className="shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    background: line.need_level === "want" ? "var(--wants-soft)" : "transparent",
                    color: line.need_level === "want" ? "var(--wants)" : "var(--muted)",
                  }}
                  title="Tap to switch between need and want"
                >
                  {line.need_level === "want" ? "Want" : "Need"}
                </button>
                <input
                  value={String(line.amount)}
                  onChange={(e) =>
                    update(index, { amount: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 })
                  }
                  inputMode="decimal"
                  aria-label="Amount"
                  className="tabular w-20 shrink-0 bg-transparent text-right text-sm font-bold outline-none"
                  style={{ color: "var(--ink)" }}
                />
              </li>
            ))}
          </ul>

          <div
            className="mb-4 flex items-baseline justify-between rounded-2xl px-4 py-3"
            style={{ background: "var(--field)" }}
          >
            <span className="label">
              {kept.length} of {lines.length} lines
            </span>
            <span className="num text-2xl">{formatMoney(total, currency)}</span>
          </div>
        </>
      )}

      {/* Browser fallback for the camera: only ever reached when the app shell
          is absent. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
      />
      {/* No capture hint, so this opens the gallery rather than the camera. */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFile(e.target.files?.[0])}
        className="hidden"
      />

      {lines ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="btn-quiet flex-1 py-3.5 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !kept.length}
            className="btn-lime flex-[2] py-3.5 text-sm"
          >
            {saving
              ? "Saving…"
              : `Save ${kept.length} ${kept.length === 1 ? "entry" : "entries"}`}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={takePhoto}
            disabled={busy || capturing}
            className="btn-lime w-full py-3.5 text-sm"
          >
            {busy ? "Reading…" : capturing ? "Camera open…" : "Take a photo"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              className="btn-quiet flex-1 py-3.5 text-sm"
            >
              Cancel
            </button>
            {/* Always offered, so a blocked or missing camera is never a dead
                end — and so a receipt you already photographed still works. */}
            <button
              type="button"
              onClick={() => {
                setError(null);
                galleryRef.current?.click();
              }}
              disabled={busy || capturing}
              className="btn-quiet flex-1 py-3.5 text-sm"
            >
              Choose from gallery
            </button>
          </div>
        </div>
      )}

      {!lines && (
        <p className="mt-3 text-center text-xs" style={{ color: "var(--muted)" }}>
          Amounts are read in {currencyMeta(currency).name}.
        </p>
      )}
    </Sheet>
  );
}
