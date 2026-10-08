import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-brand-900 px-4">
      <div className="text-center text-white">
        <div className="text-4xl font-black tracking-tight">412</div>
        <p className="mt-1 text-sm text-brand-100">Team Planner · invite only</p>
      </div>
      {/* hash routing: the whole sign-in flow lives on /sign-in (no catch-all folder needed) */}
      <SignIn routing="hash" />
      <a href="https://www.ministry412.com" className="text-xs text-brand-100 hover:underline">← Back to ministry412.com</a>
    </main>
  );
}
