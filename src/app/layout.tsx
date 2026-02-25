import { type ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b p-4 font-semibold">
        Fawnix Verse
      </header>

      <main className="p-6">
        {children}
      </main>
    </div>
  );
}