import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Unanimy</h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Bring your team together to make better decisions faster.
        </p>
        <Button asChild className="mt-10">
          <Link href="/create">Create a decision</Link>
        </Button>
      </section>
    </main>
  );
}
