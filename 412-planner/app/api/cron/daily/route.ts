import { NextResponse } from "next/server";
import { cronAuthorized, unauthorized } from "@/lib/cron";
import { runDaily } from "@/lib/notify";
import { todayET } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!cronAuthorized(req)) return unauthorized();
  const today = todayET();
  const result = await runDaily(today);
  return NextResponse.json({ ok: true, today, ...result });
}
