import Link from "next/link";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <nav className="flex gap-4 text-sm">
        <Link href="/staff">Dashboard</Link>
        <Link href="/staff/config">Config</Link>
        <Link href="/staff/decisions">Decisions</Link>
        <Link href="/staff/usage">Usage</Link>
      </nav>
      {children}
    </main>
  );
}
