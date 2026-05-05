import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const url = process.env.VALERIA_NOTIFY_URL;
  const token = process.env.VALERIA_NOTIFY_TOKEN;

  if (!url || !token) {
    return NextResponse.json({ ok: false, error: "valeria_not_configured" }, { status: 503 });
  }

  let body: { phone?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { phone, message } = body;
  if (!phone || !message) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Notify-Token": token,
      },
      body: JSON.stringify({ phone, message }),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({ ok: false, error: "invalid_response" }));

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: data?.error || `valeria_${res.status}` },
        { status: 502 }
      );
    }
    return NextResponse.json(data);
  } catch (e) {
    const err = e instanceof Error ? e.name : "fetch_error";
    return NextResponse.json({ ok: false, error: err === "AbortError" ? "timeout" : "network_error" }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }
}
