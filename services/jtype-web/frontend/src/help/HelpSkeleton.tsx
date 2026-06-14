// Eagerly-imported loading fallback for the lazily-loaded /help section.
// Mirrors HelpLayout's header and HelpHome's hero + category grid so the route
// shows a content-shaped skeleton instead of a blank screen while the (large)
// help chunk downloads. Keep this dependency-light so it stays in the eager
// bundle — importing anything from ./HelpApp would defeat the purpose.

export function HelpSkeleton() {
  return (
    <div
      className="min-h-screen bg-[#f5f8f6] text-[#0d0d0c]"
      role="status"
      aria-busy="true"
      aria-label="Loading help center"
    >
      {/* Header — matches HelpLayout's sticky brand bar */}
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <span
            className="select-none px-1.5 py-1"
            style={{ fontFamily: "'Arial Black', 'Segoe UI', Arial, sans-serif", fontSize: 17, fontWeight: 900 }}
          >
            <span className="text-[#8d939d]">[</span>
            <span className="text-brand">J</span>
            <span className="text-[#0d0d0c]">TYPE</span>
            <span className="text-[#8d939d]">]</span>
          </span>
          <div className="ml-auto hidden h-9 max-w-md flex-1 animate-pulse rounded-lg bg-black/[0.05] md:block" />
          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-black/[0.05]" />
            <div className="hidden h-9 w-24 animate-pulse rounded-lg bg-black/[0.05] sm:block" />
          </div>
        </div>
        <div className="mx-auto hidden max-w-7xl items-center gap-2 px-4 pb-2 sm:px-6 md:flex">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-lg bg-black/[0.04]" />
          ))}
        </div>
      </header>

      {/* Hero — matches HelpHome's centered title + search + video */}
      <div className="mx-auto max-w-3xl px-4 pt-16 text-center sm:px-6">
        <div className="mx-auto h-7 w-28 animate-pulse rounded-full bg-black/[0.05]" />
        <div className="mx-auto mt-6 h-10 w-72 max-w-full animate-pulse rounded-lg bg-black/[0.06]" />
        <div className="mx-auto mt-4 h-5 w-96 max-w-full animate-pulse rounded bg-black/[0.04]" />
        <div className="mx-auto mt-7 h-12 w-full max-w-xl animate-pulse rounded-xl bg-black/[0.05]" />
        <div className="mx-auto mt-10 aspect-[16/9] w-full max-w-3xl animate-pulse rounded-2xl bg-black/[0.05]" />
      </div>

      {/* Category grid — matches HelpHome's "Browse by topic" cards */}
      <div className="mx-auto mt-12 max-w-7xl px-4 sm:px-6">
        <div className="h-5 w-28 animate-pulse rounded bg-black/[0.05]" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-black/[0.05] bg-white/70 p-5">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-black/[0.06]" />
              <div className="mt-4 h-4 w-32 animate-pulse rounded bg-black/[0.06]" />
              <div className="mt-2 h-3 w-full animate-pulse rounded bg-black/[0.04]" />
              <div className="mt-1.5 h-3 w-2/3 animate-pulse rounded bg-black/[0.04]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
