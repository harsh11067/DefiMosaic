"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { ChatBubbleLeftRightIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";

/**
 * The Pit — global Arena chat. Real engine: Supabase-backed via
 * /api/arena/chat (server-memory fallback), 4s polling, degen handles.
 */

interface ChatMsg {
  id: string;
  handle: string;
  text: string;
  at: number;
}

const ADJ = ["Feral", "Liquid", "Rekt", "Alpha", "Sigma", "Turbo", "Degen", "Cosmic", "Ape", "Whale"];
const NOUN = ["Candle", "Wick", "Pump", "Chad", "Oracle", "Bull", "Bear", "Shark", "Maxi", "Wizard"];

function randomHandle() {
  return `${ADJ[Math.floor(Math.random() * ADJ.length)]}${NOUN[Math.floor(Math.random() * NOUN.length)]}${Math.floor(Math.random() * 99)}`;
}

export default function ArenaChat() {
  const { address } = useAccount();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [handle, setHandle] = useState("");
  const [engine, setEngine] = useState<string>("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const stickBottom = useRef(true);

  // Handle: wallet short-address wins; otherwise a persisted degen name
  useEffect(() => {
    if (address) {
      setHandle(`${address.slice(0, 6)}…${address.slice(-4)}`);
      return;
    }
    let h = localStorage.getItem("pitHandle");
    if (!h) {
      h = randomHandle();
      localStorage.setItem("pitHandle", h);
    }
    setHandle(h);
  }, [address]);

  const fetchMessages = async () => {
    try {
      const r = await fetch("/api/arena/chat");
      if (!r.ok) return;
      const data = await r.json();
      if (Array.isArray(data.messages)) {
        setMessages(data.messages);
        setEngine(data.engine);
      }
    } catch {}
  };

  useEffect(() => {
    fetchMessages();
    const id = setInterval(fetchMessages, 4000);
    return () => clearInterval(id);
  }, []);

  // Autoscroll only when the user is already at the bottom
  useEffect(() => {
    const el = listRef.current;
    if (el && stickBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setText("");
    // optimistic append
    setMessages((m) => [...m, { id: `local-${Date.now()}`, handle, text: t, at: Date.now() }]);
    stickBottom.current = true;
    try {
      await fetch("/api/arena/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, text: t }),
      });
      fetchMessages();
    } catch {}
    setSending(false);
  };

  return (
    <div className="glass-panel p-5 flex flex-col h-[380px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="h-4 w-4 text-pink-300" /> The Pit
          <span className="live-dot ml-1" />
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-gray-500">
          {engine === "supabase" ? "live · durable" : engine === "memory" ? "live · session" : "connecting"}
        </span>
      </div>

      <div ref={listRef} onScroll={onScroll} className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-500 pt-6 text-center">
            Silence in the Pit. Call your shot first. 🎤
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-sm leading-snug">
              <span className={`font-semibold ${m.handle === handle ? "text-cyan-300" : "text-violet-300"}`}>
                {m.handle}
              </span>{" "}
              <span className="text-gray-300 break-words">{m.text}</span>
            </div>
          ))
        )}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          placeholder={`Talk your book as ${handle}…`}
          className="flex-1 bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:border-pink-500/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="px-3 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 text-white disabled:opacity-40 transition-all hover:shadow-[0_0_20px_rgba(236,72,153,0.4)]"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
