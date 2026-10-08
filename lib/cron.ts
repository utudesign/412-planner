import "server-only";
import { NextResponse } from "next/server";

/** Vercel Cron sends "Authorization: Bearer $CRON_SECRET". Reject everything else. */
export function cronAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}
export const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
