import "server-only";
import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db, must } from "./supabase";
import type { Member } from "./types";

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

/**
 * Resolve the signed-in Clerk user to a members row.
 * 1. Already linked by clerk_user_id → return it.
 * 2. A member with the same email exists (pre-added by an admin) → link it.
 * 3. Otherwise create a new member (Admin if listed in ADMIN_EMAILS).
 * Sign-up itself is restricted in Clerk (invite-only), so only invited people reach step 3.
 */
export const getMe = cache(async (): Promise<Member | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const linked = must(await db().from("members").select("*").eq("clerk_user_id", userId).maybeSingle());
  if (linked) return linked as Member;

  const user = await currentUser();
  if (!user) return null;
  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || email?.split("@")[0] || "Member";

  if (email) {
    const byEmail = must(await db().from("members").select("*").ilike("email", email).is("clerk_user_id", null).maybeSingle());
    if (byEmail) {
      return must(
        await db().from("members")
          .update({ clerk_user_id: userId, image_url: user.imageUrl, email })
          .eq("id", (byEmail as Member).id).select("*").single(),
      ) as Member;
    }
  }

  const isAdmin = !!email && adminEmails().includes(email);
  if (isAdmin) {
    // First admin sign-in claims the seeded admin row (seed data carries no email).
    const seeded = must(await db().from("members").select("*").eq("role", "admin").is("clerk_user_id", null).is("email", null).limit(1).maybeSingle());
    if (seeded) {
      return must(
        await db().from("members").update({ clerk_user_id: userId, image_url: user.imageUrl, email })
          .eq("id", (seeded as Member).id).select("*").single(),
      ) as Member;
    }
  }
  const role = isAdmin ? "admin" : "member";
  return must(
    await db().from("members")
      .insert({ clerk_user_id: userId, email, name, role, image_url: user.imageUrl })
      .select("*").single(),
  ) as Member;
});

export async function requireMe(): Promise<Member> {
  const me = await getMe();
  if (!me) redirect("/sign-in");
  return me;
}
