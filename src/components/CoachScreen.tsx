"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "Where is most of my money going?",
  "How can I save more this month?",
  "Was my spending this week reasonable?",
  "What should I cut first?",
];

export function CoachScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((body) => setMessages(body.messages ?? []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;

    setInput("");
    setSending(true);

    const userMessage: Message = { id: `local-${Date.now()}`, role: "user", content: message };
    const replyId = `local-${Date.now()}-reply`;
    setMessages((prev) => [...prev, userMessage, { id: replyId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "The coach is unavailable right now.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === replyId ? { ...m, content: full } : m)),
        );
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((prev) => prev.map((m) => (m.id === replyId ? { ...m, content: text } : m)));
    } finally {
      setSending(false);
    }
  }

  async function clear() {
    await fetch("/api/chat", { method: "DELETE" });
    setMessages([]);
  }

  return (
    <div className="flex min-h-[calc(100dvh-140px)] flex-col">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Money coach</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Talks about your money — nothing else.
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="rounded-lg px-2.5 py-1.5 text-xs"
            style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
          >
            Clear
          </button>
        )}
      </header>

      <div className="flex-1 pb-4">
        {loaded && messages.length === 0 && (
          <div className="flex flex-col gap-2 pt-4">
            <p className="mb-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              Ask me something like:
            </p>
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => send(starter)}
                className="rounded-xl px-4 py-3 text-left text-sm"
                style={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                {starter}
              </button>
            ))}
          </div>
        )}

        <ul className="flex flex-col gap-3">
          {messages.map((message) => {
            const mine = message.role === "user";
            return (
              <li
                key={message.id}
                className={mine ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                  style={
                    mine
                      ? { background: "var(--lime)", color: "var(--lime-ink)" }
                      : {
                          background: "var(--surface-1)",
                          border: "1px solid var(--border)",
                          color: "var(--text-primary)",
                        }
                  }
                >
                  {message.content || (
                    <span style={{ color: "var(--text-muted)" }} aria-label="Thinking">
                      …
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-0 flex gap-2 pb-2 pt-2"
        style={{ background: "var(--page)" }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your money…"
          maxLength={4000}
          className="min-w-0 flex-1 rounded-xl px-3.5 py-3 text-sm outline-none"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="btn-lime px-5 py-3 text-sm"
        >
          Send
        </button>
      </form>
    </div>
  );
}
