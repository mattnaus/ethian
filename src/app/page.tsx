export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-4 px-4">
        <h1 className="text-4xl font-bold tracking-tight">Ethian</h1>
        <p className="text-muted-foreground text-lg max-w-md">
          A calm, intentional email client. Screener, Imbox, Feed, Paper Trail
          — coming soon.
        </p>
        <p className="text-sm text-muted-foreground">
          Built with Next.js 15 · Drizzle ORM · BullMQ
        </p>
      </div>
    </main>
  );
}
