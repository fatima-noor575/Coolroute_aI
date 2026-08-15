import { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, RefreshCw, Sparkles, X } from "lucide-react";
import type { ExplanationResponse, Route } from "@/types/route.types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  loading: boolean;
  data: ExplanationResponse | null;
  route: Route | null;
  onClose: () => void;
  onRegenerate: () => void;
}

export function AIExplanationPanel({ open, loading, data, route, onClose, onRegenerate }: Props) {
  const [typed, setTyped] = useState("");
  const [expanded, setExpanded] = useState<string | null>("shadeOptimization");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!data) return setTyped("");
    let i = 0;
    const text = data.explanation;
    const id = setInterval(() => {
      i += 4;
      setTyped(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 12);
    return () => clearInterval(id);
  }, [data]);

  const sections: { key: keyof ExplanationResponse["factors"]; title: string }[] = [
    { key: "shadeOptimization", title: "Shade optimisation" },
    { key: "timeConsideration", title: "Time of day" },
    { key: "weatherImpact", title: "Weather conditions" },
    { key: "alternativeComparison", title: "Alternative routes" },
  ];

  return (
    <aside
      className={cn(
        "glass-strong pointer-events-auto fixed top-0 right-0 z-50 flex h-full w-full max-w-[420px] flex-col rounded-none transition-transform duration-500 md:rounded-l-3xl",
        open ? "translate-x-0" : "translate-x-full",
      )}
      style={{ transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)" }}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[color:var(--mint)]" />
          <h2 className="font-display text-sm font-semibold">Why this route?</h2>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {loading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-3 animate-pulse rounded bg-white/8" style={{ width: `${70 + (i % 3) * 10}%` }} />
            ))}
          </div>
        )}

        {!loading && data && route && (
          <>
            <div className="flex items-center justify-between text-[11px]">
              <span className="metric rounded-full bg-[color:var(--cyan-glow)]/12 px-2.5 py-1 text-[color:var(--cyan-glow)]">
                {route.name} · {route.properties.shadeCoverage}% shade
              </span>
              <span className="metric text-muted-foreground">confidence {data.confidence}%</span>
            </div>

            <p className="text-sm leading-relaxed text-foreground/90">{typed}</p>

            <div className="space-y-2">
              {sections.map((s) => (
                <div key={s.key} className="rounded-xl border border-white/10 bg-white/5">
                  <button
                    onClick={() => setExpanded(expanded === s.key ? null : s.key)}
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs font-medium"
                  >
                    {s.title}
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded === s.key && "rotate-180")} />
                  </button>
                  {expanded === s.key && (
                    <p className="animate-fade-in px-3.5 pb-3 text-[12px] leading-relaxed text-muted-foreground">
                      {data.factors[s.key]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div>
              <p className="mb-2 text-[10px] tracking-[0.16em] text-muted-foreground uppercase">Recommendations</p>
              <ul className="space-y-1.5">
                {data.factors.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2 text-[12px] text-foreground/85">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--mint)]" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 border-t border-white/10 px-5 py-4">
        <button
          onClick={() => {
            if (!data) return;
            navigator.clipboard?.writeText(data.explanation);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 py-2.5 text-xs font-medium hover:bg-white/10"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[color:var(--mint)]" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          onClick={onRegenerate}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[color:var(--cyan-glow)]/15 py-2.5 text-xs font-medium text-[color:var(--cyan-glow)] ring-1 ring-[color:var(--cyan-glow)]/40 hover:bg-[color:var(--cyan-glow)]/25"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Regenerate
        </button>
      </div>
    </aside>
  );
}
