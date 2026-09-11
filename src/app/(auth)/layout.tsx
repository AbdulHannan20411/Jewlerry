import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex justify-center border-b border-border/60 py-6">
        <Link href="/" className="font-heading text-2xl font-semibold tracking-wide text-foreground">
          Atelier <span className="text-primary">Jewelry</span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
