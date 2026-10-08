import Link from "next/link";
export default function NotFound() {
  return (
    <div className="px-8 py-20 text-center">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-slate-500">This project may have been archived.</p>
      <Link href="/" className="btn mt-6">Back home</Link>
    </div>
  );
}
