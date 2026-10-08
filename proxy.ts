import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything is private except the sign-in page and the cron endpoints.
// Cron routes check CRON_SECRET themselves.
const isPublic = createRouteMatcher(["/sign-in(.*)", "/api/cron/(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
