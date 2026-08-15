export function LoadingState() {
  return (
    <div className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-background/60 backdrop-blur-sm">
      <div className="glass-strong w-[320px] p-6 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[color:var(--cyan-glow)]" />
        <p className="font-display mt-4 text-sm font-semibold">Calculating optimal shade route…</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Tracing shadow geometry across street segments
        </p>
        <div className="relative mt-4 h-1 overflow-hidden rounded-full bg-white/8">
          <div className="animate-sweep absolute inset-y-0 w-1/3 rounded-full bg-[color:var(--cyan-glow)]" />
        </div>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm">
      <div className="glass-strong w-[340px] p-6 text-center">
        <p className="font-display text-base font-semibold text-destructive">Route calculation failed</p>
        <p className="mt-2 text-xs text-muted-foreground">{message}</p>
        <button
          onClick={onRetry}
          className="mt-4 w-full rounded-xl bg-[color:var(--cyan-glow)] px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
