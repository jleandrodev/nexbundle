/**
 * Motor de agendamento das promoções — PURO (sem DB, sem imports de servidor).
 * Seguro para usar no cliente (WeekTimeline) e no servidor (loaders).
 *
 * Uma janela é derivada de: recurrence + weekdays + startTime/endTime interpretados
 * no `timezone` (IANA), dentro de [validFrom, validUntil]. Janela que "vira o dia"
 * quando endTime <= startTime (ex.: 22:00 → 02:00).
 *
 * Timezone: usamos Intl para obter o offset real (com DST) de cada instante, sem
 * depender de bibliotecas externas.
 */

export type Recurrence = "once" | "daily" | "weekly";
export type PromotionStatus = "paused" | "error" | "live" | "scheduled" | "ended";

export interface ScheduleFields {
  enabled: boolean;
  timezone: string;
  recurrence: Recurrence | string;
  weekdays: number[]; // 0=domingo .. 6=sábado
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  validFrom: Date | null;
  validUntil: Date | null;
  syncError?: string | null;
}

export interface TimeWindow {
  startsAt: Date;
  endsAt: Date;
}

type Day = { y: number; mo: number; d: number }; // mo = 0-based

/* ------------------------------------------------------------------ timezone */

function partsInTz(date: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
  const wd: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    y: +map.year,
    mo: +map.month - 1,
    d: +map.day,
    hour: +map.hour,
    minute: +map.minute,
    weekday: wd[map.weekday] ?? 0,
  };
}

/** Offset (ms) entre o timezone e o UTC no instante `date`. */
function tzOffsetMs(date: Date, tz: string): number {
  const p = partsInTz(date, tz);
  const asUTC = Date.UTC(p.y, p.mo, p.d, p.hour, p.minute, 0);
  const real = Math.floor(date.getTime() / 60000) * 60000; // precisão de minuto
  return asUTC - real;
}

/** Converte uma hora "de parede" (no tz) para o instante UTC correspondente. */
function zonedWallToUtc(y: number, mo: number, d: number, h: number, mi: number, tz: string): Date {
  const guess = Date.UTC(y, mo, d, h, mi, 0);
  const off1 = tzOffsetMs(new Date(guess), tz);
  let ts = guess - off1;
  const off2 = tzOffsetMs(new Date(ts), tz);
  if (off2 !== off1) ts = guess - off2; // corrige borda de DST
  return new Date(ts);
}

/* --------------------------------------------------------------------- dias */

function parseHM(s: string): [number, number] {
  const m = /^(\d{1,2}):(\d{2})$/.exec((s || "").trim());
  if (!m) return [0, 0];
  return [Math.min(23, +m[1]), Math.min(59, +m[2])];
}

function addDays(day: Day, n: number): Day {
  // meio-dia UTC evita saltos por DST ao normalizar a data do calendário.
  const dt = new Date(Date.UTC(day.y, day.mo, day.d + n, 12, 0, 0));
  return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth(), d: dt.getUTCDate() };
}

function localWeekday(day: Day, tz: string): number {
  return partsInTz(zonedWallToUtc(day.y, day.mo, day.d, 12, 0, tz), tz).weekday;
}

/** Janela UTC para um dia de calendário local. Trata janela que vira o dia. */
function windowForDay(day: Day, f: ScheduleFields): TimeWindow {
  const [sh, sm] = parseHM(f.startTime);
  const [eh, em] = parseHM(f.endTime);
  const overnight = eh * 60 + em <= sh * 60 + sm;
  const startsAt = zonedWallToUtc(day.y, day.mo, day.d, sh, sm, f.timezone);
  const endDay = overnight ? addDays(day, 1) : day;
  const endsAt = zonedWallToUtc(endDay.y, endDay.mo, endDay.d, eh, em, f.timezone);
  return { startsAt, endsAt };
}

function dayMatches(day: Day, f: ScheduleFields): boolean {
  const rec = f.recurrence;
  if (rec === "daily") return true;
  if (rec === "weekly") return f.weekdays.includes(localWeekday(day, f.timezone));
  if (rec === "once") {
    if (!f.validFrom) return false;
    const p = partsInTz(f.validFrom, f.timezone);
    return p.y === day.y && p.mo === day.mo && p.d === day.d;
  }
  return false;
}

function withinValid(w: TimeWindow, f: ScheduleFields): boolean {
  if (f.validFrom && w.endsAt <= f.validFrom) return false;
  if (f.validUntil && w.startsAt >= f.validUntil) return false;
  return true;
}

/* ---------------------------------------------------------------- API pública */

/**
 * Janela ATUAL (se `now` está dentro de uma) ou a PRÓXIMA janela futura.
 * Retorna null se não há nenhuma dentro do horizonte / validade.
 */
export function nextWindowOf(f: ScheduleFields, now: Date, horizonDays = 366): TimeWindow | null {
  const base = partsInTz(now, f.timezone);
  let day: Day = addDays({ y: base.y, mo: base.mo, d: base.d }, -1); // -1: pega janela overnight de ontem
  for (let i = 0; i <= horizonDays + 1; i++, day = addDays(day, 1)) {
    if (f.validUntil) {
      const dayStart = zonedWallToUtc(day.y, day.mo, day.d, 0, 0, f.timezone);
      if (dayStart > f.validUntil) break;
    }
    if (!dayMatches(day, f)) continue;
    const w = windowForDay(day, f);
    if (!withinValid(w, f)) continue;
    if (w.endsAt > now) return w; // janela atual (live) ou a próxima
  }
  return null;
}

/** Todas as janelas que se sobrepõem a [rangeStart, rangeEnd]. Para a timeline. */
export function windowsInRange(f: ScheduleFields, rangeStart: Date, rangeEnd: Date): TimeWindow[] {
  const s = partsInTz(rangeStart, f.timezone);
  let day: Day = addDays({ y: s.y, mo: s.mo, d: s.d }, -1);
  const out: TimeWindow[] = [];
  for (let i = 0; i < 400; i++, day = addDays(day, 1)) {
    const dayStart = zonedWallToUtc(day.y, day.mo, day.d, 0, 0, f.timezone);
    if (dayStart > rangeEnd) break;
    if (!dayMatches(day, f)) continue;
    const w = windowForDay(day, f);
    if (!withinValid(w, f)) continue;
    if (w.endsAt > rangeStart && w.startsAt < rangeEnd) out.push(w);
  }
  return out;
}

/** Status de exibição da promoção. */
export function promotionStatus(f: ScheduleFields, now: Date): PromotionStatus {
  if (f.syncError) return "error";
  if (!f.enabled) return "paused";
  const w = nextWindowOf(f, now);
  if (!w) return "ended";
  return w.startsAt <= now && now < w.endsAt ? "live" : "scheduled";
}

/* --------------------------------------------------------- helpers de weekdays */

export function parseWeekdays(csv: string | null | undefined): number[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => n >= 0 && n <= 6);
}

export function formatWeekdays(days: number[]): string {
  return [...new Set(days)].filter((n) => n >= 0 && n <= 6).sort((a, b) => a - b).join(",");
}
