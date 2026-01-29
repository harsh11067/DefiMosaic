import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Stub: validate and respond. On-chain execution handled client-side or via relayer service
    const { to, amount, token } = body ?? {};
    if (!to || !amount || !token) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}



