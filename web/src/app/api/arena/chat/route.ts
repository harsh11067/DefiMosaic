import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

/**
 * The Pit — Arena trash-talk chat.
 *
 * Real engine, two tiers:
 *  1. Supabase table `arena_chat` (durable, multi-instance) when available.
 *  2. Server-memory ring buffer fallback — still genuinely multi-user on a
 *     single deployment, just ephemeral across restarts. The response flags
 *     which engine served it.
 *
 * GET  /api/arena/chat            -> latest 50 messages (oldest first)
 * POST /api/arena/chat            -> { handle, text }
 */

interface ChatMsg {
  id: string;
  handle: string;
  text: string;
  at: number;
}

const globalStore = globalThis as unknown as { __arenaChat?: ChatMsg[] };
if (!globalStore.__arenaChat) globalStore.__arenaChat = [];

const MAX_MEM = 200;
const MAX_TEXT = 280;
const MAX_HANDLE = 24;

function sanitize(s: string, max: number) {
  return s.replace(/[<>]/g, "").trim().slice(0, max);
}

export async function GET() {
  const supabase = getSupabaseServer();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("arena_chat")
        .select("id, handle, text, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) {
        const messages = data
          .map((m: any) => ({
            id: String(m.id),
            handle: m.handle,
            text: m.text,
            at: new Date(m.created_at).getTime(),
          }))
          .reverse();
        return NextResponse.json({ engine: "supabase", messages });
      }
    } catch {}
  }
  return NextResponse.json({ engine: "memory", messages: globalStore.__arenaChat!.slice(-50) });
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const handle = sanitize(String(body.handle || ""), MAX_HANDLE) || "anon";
  const text = sanitize(String(body.text || ""), MAX_TEXT);
  if (!text) return NextResponse.json({ ok: false, error: "empty message" }, { status: 400 });

  const msg: ChatMsg = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    handle,
    text,
    at: Date.now(),
  };

  const supabase = getSupabaseServer();
  if (supabase) {
    try {
      const { error } = await supabase
        .from("arena_chat")
        .insert({ handle: msg.handle, text: msg.text, created_at: new Date(msg.at).toISOString() });
      if (!error) return NextResponse.json({ ok: true, engine: "supabase" });
      // table missing -> fall through to memory so chat still works
    } catch {}
  }

  globalStore.__arenaChat!.push(msg);
  if (globalStore.__arenaChat!.length > MAX_MEM) {
    globalStore.__arenaChat = globalStore.__arenaChat!.slice(-MAX_MEM);
  }
  return NextResponse.json({ ok: true, engine: "memory" });
}
