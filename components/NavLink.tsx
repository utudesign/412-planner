"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, prefix, children }: { href: string; prefix?: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const active = prefix ? path.startsWith(href) : path === href;
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 ${active ? "bg-white/15 text-white" : "hover:bg-white/10"}`}
    >
      {children}
    </Link>
  );
}
