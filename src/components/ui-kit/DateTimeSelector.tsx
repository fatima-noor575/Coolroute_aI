import { CalendarDays, Sunrise, Sunset, Sun, Zap } from "lucide-react";
import { format } from "date-fns";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { SUNRISE_MINUTES, SUNSET_MINUTES } from "@/services/routing";
import { formatClock } from "@/utils/formatters";
import { cn } from "@/lib/utils";

interface Props {
  date: Date;
  minutes: number;
  uvIndex: number;
  onDateChange: (d: Date) => void;
  onMinutesChange: (m: number) => void;
}

const QUICK = [
  { label: "Now", icon: Zap, value: () => new Date().getHours() * 60 + new Date().getMinutes() },
  { label: "Sunrise", icon: Sunrise, value: () => SUNRISE_MINUTES },
  { label: "Noon", icon: Sun, value: () => 12 * 60 },
  { label: "Sunset", icon: Sunset, value: () => SUNSET_MINUTES },
];

export function DateTimeSelector({ date, minutes, uvIndex, onDateChange, onMinutesChange }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm transition-colors hover:border-white/25">
              <CalendarDays className="h-4 w-4 text-[color:var(--cyan-glow)]" />
              <span className="metric">{format(date, "EEE, dd MMM yyyy")}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={(d) => d && onDateChange(d)} />
          </PopoverContent>
        </Popover>
        <div className="metric rounded-xl border border-[color:var(--amber-sun)]/35 bg-[color:var(--amber-sun)]/10 px-3 py-2.5 text-sm text-[color:var(--amber-sun)]">
          UV {uvIndex}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            Departure
          </span>
          <span className="metric text-lg text-[color:var(--cyan-glow)]">
            {formatClock(minutes)}
          </span>
        </div>
        <Slider
          min={7 * 60}
          max={19 * 60}
          step={15}
          value={[Math.min(19 * 60, Math.max(7 * 60, minutes))]}
          onValueChange={(v) => onMinutesChange(v[0] ?? minutes)}
        />
        <div className="metric mt-1.5 flex justify-between text-[10px] text-muted-foreground">
          <span>7 AM</span>
          <span>1 PM</span>
          <span>7 PM</span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {QUICK.map((q) => {
            const val = q.value();
            const active = Math.abs(val - minutes) < 8;
            const Icon = q.icon;
            return (
              <button
                key={q.label}
                type="button"
                onClick={() => onMinutesChange(Math.min(19 * 60, Math.max(7 * 60, val)))}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-lg border px-1.5 py-1.5 text-[10px] transition-colors",
                  active
                    ? "border-[color:var(--mint)]/50 bg-[color:var(--mint)]/10 text-[color:var(--mint)]"
                    : "border-white/10 text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3 w-3" />
                {q.label}
              </button>
            );
          })}
        </div>
        <p className="metric mt-2.5 flex justify-between border-t border-white/10 pt-2 text-[10px] text-muted-foreground">
          <span>Sunrise {formatClock(SUNRISE_MINUTES)}</span>
          <span>Sunset {formatClock(SUNSET_MINUTES)}</span>
        </p>
      </div>
    </div>
  );
}
