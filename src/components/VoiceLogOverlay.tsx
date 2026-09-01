"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Sheet } from "@/components/Sheet";
import type { AddPrefill } from "@/components/AddExpenseSheet";

/*
 * Speech recognition is a vendor-prefixed browser API with no types in the
 * standard lib, so the shape we actually touch is declared here rather than
 * pulling in a dependency for four properties.
 */
interface SpeechResultAlternative {
  transcript: string;
}
interface SpeechResult {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechResultAlternative;
}
interface SpeechResultList {
  readonly length: number;
  [index: number]: SpeechResult;
}
interface SpeechEvent {
  resultIndex: number;
  results: SpeechResultList;
}
interface Recogniser {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecogniserCtor = new () => Recogniser;

function recogniserCtor(): RecogniserCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecogniserCtor;
    webkitSpeechRecognition?: RecogniserCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Stage = "listening" | "typing" | "thinking" | "failed";

/**
 * Say it, don't type it.
 *
 * The words are turned into text by the browser (free, on-device on most
 * phones) and only the text is sent to the server to be read into fields.
 * Nothing is ever saved from here — the parsed result opens the normal add
 * sheet so it can be corrected before it lands in the ledger.
 */
export function VoiceLogOverlay({
  open,
  onClose,
  onParsed,
}: {
  open: boolean;
  onClose: () => void;
  onParsed: (prefill: AddPrefill) => void;
}) {
  const [stage, setStage] = useState<Stage>("listening");
  const [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const recogniser = useRef<Recogniser | null>(null);
  const finalText = useRef("");
  const errored = useRef(false);

  const send = useCallback(
    async (text: string) => {
      const said = text.trim();
      if (!said) {
        setStage("failed");
        setMessage("Nothing was picked up. Try again, or type it below.");
        return;
      }

      setStage("thinking");
      try {
        const res = await fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: said }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Could not make sense of that");

        if (!body.understood || !body.amount) {
          setStage("failed");
          setTranscript(said);
          setMessage("I heard you, but no amount in there. Try “chai two hundred”.");
          return;
        }

        onParsed({
          item: body.item ?? said,
          amount: Number(body.amount),
          category: body.category ?? null,
          need_level: body.need_level ?? "unclear",
          source: "voice",
          day_offset: Number(body.day_offset) || 0,
        });
      } catch (err) {
        setStage("failed");
        setTranscript(said);
        setMessage(err instanceof Error ? err.message : "Could not make sense of that");
      }
    },
    [onParsed],
  );

  useEffect(() => {
    if (!open) return;

    setTranscript("");
    setMessage(null);
    finalText.current = "";
    errored.current = false;

    const Ctor = recogniserCtor();
    if (!Ctor) {
      setStage("typing");
      setMessage("This browser cannot listen. Type what you spent and it still gets read.");
      return;
    }

    setStage("listening");
    const rec = new Ctor();
    recogniser.current = rec;
    rec.lang = navigator.language || "en-US";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let live = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText.current += result[0].transcript;
        else live += result[0].transcript;
      }
      setTranscript((finalText.current + live).trim());
    };

    rec.onerror = (event) => {
      errored.current = true;
      setStage(event.error === "not-allowed" ? "failed" : "typing");
      setMessage(
        event.error === "not-allowed"
          ? "Microphone access is blocked. Allow it in your browser settings, or type it below."
          : "Could not hear that. Type it instead.",
      );
    };

    // Recognition stops on its own after a pause; that pause is the cue to parse.
    rec.onend = () => {
      const said = finalText.current.trim();
      if (said) {
        void send(said);
        return;
      }
      // onend also fires after onerror; that message is the more useful one.
      if (errored.current) return;
      // Silence, or a mic that never opened. Either way, offer the keyboard.
      setStage("failed");
      setMessage("Nothing was picked up. Try again, or type it below.");
    };

    try {
      rec.start();
    } catch {
      setStage("typing");
    }

    return () => {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        // Already stopped.
      }
      recogniser.current = null;
    };
  }, [open, send]);

  function stopEarly() {
    try {
      recogniser.current?.stop();
    } catch {
      void send(transcript);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} label="Log a spend by voice">
      <h2 className="text-base font-bold">Say what you spent</h2>
      <p className="mt-1 text-sm" style={{ color: "var(--ink-2)" }}>
        Something like &ldquo;three hundred on chai&rdquo;.
      </p>

      <div className="my-7 flex flex-col items-center">
        <div className="relative flex size-24 items-center justify-center">
          {stage === "listening" && (
            <span
              aria-hidden
              className="pulse-ring absolute inset-0 rounded-full"
              style={{ background: "var(--lime)" }}
            />
          )}
          <span
            className="relative flex size-20 items-center justify-center rounded-full"
            style={{
              background: stage === "listening" ? "var(--lime)" : "var(--field)",
              color: stage === "listening" ? "var(--lime-ink)" : "var(--muted)",
            }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm7-3a7 7 0 0 1-14 0m7 7v3" />
            </svg>
          </span>
        </div>

        <p
          className="mt-4 min-h-6 px-2 text-center text-lg font-semibold"
          style={{ color: transcript ? "var(--ink)" : "var(--muted)" }}
          aria-live="polite"
        >
          {stage === "thinking"
            ? "Reading that…"
            : transcript || (stage === "listening" ? "Listening…" : "")}
        </p>
      </div>

      {message && (
        <p className="mb-3 text-center text-sm" style={{ color: "var(--ink-2)" }} role="status">
          {message}
        </p>
      )}

      {(stage === "typing" || stage === "failed") && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(transcript);
          }}
          className="mb-3 flex gap-2"
        >
          <input
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="300 on chai"
            maxLength={500}
            className="min-w-0 flex-1 rounded-2xl px-4 py-3 text-base outline-none"
            style={{ background: "var(--field)", color: "var(--ink)" }}
          />
          <button type="submit" className="btn-lime px-5 text-sm">
            Read it
          </button>
        </form>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="btn-quiet flex-1 py-3.5 text-sm">
          Cancel
        </button>
        {stage === "listening" && (
          <button type="button" onClick={stopEarly} className="btn-lime flex-1 py-3.5 text-sm">
            Done
          </button>
        )}
      </div>
    </Sheet>
  );
}
