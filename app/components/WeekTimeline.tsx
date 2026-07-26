/**
 * WeekTimeline — a "tela-assinatura" do dashboard.
 *
 * Linha do tempo da semana atual (segunda→domingo) no fuso `displayTimezone`:
 * 7 colunas (dias) com eixo de horas 0–24h na vertical e faixas coloridas para
 * cada janela de promoção, posicionadas pelo horário do dia. Marca a linha do
 * "agora".
 *
 * Motor de agendamento reaproveitado de app/lib/schedule.ts (windowsInRange).
 * Timezone tratado só com Intl/Date — sem libs externas.
 *
 * SSR-safe: a semana e o "agora" dependem do relógio; nada disso é calculado no
 * render inicial. Enquanto `now === null` (servidor + 1ª hidratação) mostramos um
 * esqueleto estável de altura fixa, evitando hydration mismatch.
 */
import { Card } from "@shopify/polaris";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { windowsInRange } from "../lib/schedule";
import type { PromotionStatus, ScheduleFields, TimeWindow } from "../lib/schedule";

export type EnrichedPromotion = {
  id: string;
  name: string;
  enabled: boolean;
  timezone: string;
  recurrence: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  validFrom: string | null;
  validUntil: string | null;
  status: PromotionStatus;
  windowStart: string | null;
  windowEnd: string | null;
};

/* ------------------------------------------------------------------- dimensões */

const HEADER_H = 52; // altura do cabeçalho de cada dia
const TRACK_H = 480; // altura da faixa de horas (0–24h)
const GUTTER_W = 46; // largura do eixo de horas à esquerda
const MIN_COL = 98; // largura mínima de uma coluna de dia (dispara scroll-x)
const HOUR_MARKS = [0, 6, 12, 18, 24];

/* --------------------------------------------------------------------- paleta */

type Swatch = { rail: string; fill: string; text: string };
// Tons discretos, coerentes com o Polaris (verde/âmbar/cinza/vermelho).
const PALETTE: Record<PromotionStatus, Swatch> = {
  live: { rail: "#1F845A", fill: "#E7F4EC", text: "#0C5132" },
  scheduled: { rail: "#B98900", fill: "#FBF3D8", text: "#7E5700" },
  paused: { rail: "#8A8A8A", fill: "#F1F1F1", text: "#5C5F62" },
  error: { rail: "#D72C0D", fill: "#FCEBE7", text: "#8E1F0B" },
  ended: { rail: "#C9CCCF", fill: "#F6F6F7", text: "#6D7175" },
};

const INK = "#42474C";
const MUTED = "#8C9196";
const GRID = "#E7E9EB";
const BORDER = "#E1E3E5";
const NOW = "#2C6ECB"; // azul distinto dos status (verde/âmbar/vermelho)

/* ------------------------------------------------------------- helpers de tempo */

const WD: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

type Cal = { y: number; mo: number; d: number }; // mo = 0-based

/** Data/hora "de parede" de um instante, no fuso `tz`. */
function partsInTz(date: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
  return {
    y: +map.year,
    mo: +map.month - 1,
    d: +map.day,
    hour: +map.hour,
    minute: +map.minute,
    weekday: WD[map.weekday] ?? 0,
  };
}

/** Offset (ms) entre o `tz` e o UTC no instante `date`. */
function tzOffsetMs(date: Date, tz: string): number {
  const p = partsInTz(date, tz);
  const asUTC = Date.UTC(p.y, p.mo, p.d, p.hour, p.minute, 0);
  const real = Math.floor(date.getTime() / 60000) * 60000;
  return asUTC - real;
}

/** Converte hora "de parede" (no tz) para o instante UTC correspondente. */
function zonedWallToUtc(c: Cal, h: number, mi: number, tz: string): Date {
  const guess = Date.UTC(c.y, c.mo, c.d, h, mi, 0);
  const off1 = tzOffsetMs(new Date(guess), tz);
  let ts = guess - off1;
  const off2 = tzOffsetMs(new Date(ts), tz);
  if (off2 !== off1) ts = guess - off2; // borda de DST
  return new Date(ts);
}

/** Soma `n` dias de calendário (via meio-dia UTC, imune a saltos de DST). */
function addDays(c: Cal, n: number): Cal {
  const dt = new Date(Date.UTC(c.y, c.mo, c.d + n, 12, 0, 0));
  return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth(), d: dt.getUTCDate() };
}

/* ------------------------------------------------------------------- estrutura */

type DayColumn = {
  cal: Cal;
  startUtc: number; // 00:00 local, em ms UTC
  endUtc: number; // 00:00 do dia seguinte, em ms UTC
  noonUtc: Date; // instante estável para rotular a data
};

type Band = {
  key: string;
  status: PromotionStatus;
  name: string;
  topPct: number;
  heightPct: number;
  win: TimeWindow;
};

function toFields(p: EnrichedPromotion): ScheduleFields {
  return {
    enabled: p.enabled,
    timezone: p.timezone,
    recurrence: p.recurrence,
    weekdays: p.weekdays,
    startTime: p.startTime,
    endTime: p.endTime,
    validFrom: p.validFrom ? new Date(p.validFrom) : null,
    validUntil: p.validUntil ? new Date(p.validUntil) : null,
  };
}

/** Colunas Mon→Sun da semana que contém `now`, no fuso `tz`. */
function buildWeek(now: number, tz: string): DayColumn[] {
  const base = partsInTz(new Date(now), tz);
  // weekday: 0=domingo..6=sábado → deslocamento até a segunda-feira.
  const backToMonday = (base.weekday + 6) % 7;
  const monday = addDays({ y: base.y, mo: base.mo, d: base.d }, -backToMonday);

  const cols: DayColumn[] = [];
  for (let i = 0; i < 7; i++) {
    const cal = addDays(monday, i);
    const startUtc = zonedWallToUtc(cal, 0, 0, tz).getTime();
    const endUtc = zonedWallToUtc(addDays(cal, 1), 0, 0, tz).getTime();
    cols.push({ cal, startUtc, endUtc, noonUtc: zonedWallToUtc(cal, 12, 0, tz) });
  }
  return cols;
}

export default function WeekTimeline({
  promotions,
  displayTimezone,
}: {
  promotions: EnrichedPromotion[];
  displayTimezone: string;
}) {
  const { t, i18n } = useTranslation("promotions");

  // Relógio: nunca no render inicial (SSR-safe). Atualiza a cada minuto.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const week = useMemo(
    () => (now === null ? null : buildWeek(now, displayTimezone)),
    [now, displayTimezone],
  );

  // Faixas por coluna: cada janela é recortada em cada dia que ela cruza,
  // de modo que janelas que "viram o dia" aparecem em duas colunas.
  const bandsByDay = useMemo<Band[][]>(() => {
    if (!week) return [];
    const weekStart = new Date(week[0].startUtc);
    const weekEnd = new Date(week[6].endUtc);
    const cols: Band[][] = week.map(() => []);

    for (const p of promotions) {
      const wins = windowsInRange(toFields(p), weekStart, weekEnd);
      for (const w of wins) {
        const s = w.startsAt.getTime();
        const e = w.endsAt.getTime();
        week.forEach((col, i) => {
          const segStart = Math.max(s, col.startUtc);
          const segEnd = Math.min(e, col.endUtc);
          if (segEnd <= segStart) return;
          const span = col.endUtc - col.startUtc;
          const topPct = ((segStart - col.startUtc) / span) * 100;
          const heightPct = ((segEnd - segStart) / span) * 100;
          cols[i].push({
            key: `${p.id}-${s}`,
            status: p.status,
            name: p.name,
            topPct,
            heightPct,
            win: w,
          });
        });
      }
    }
    return cols;
  }, [week, promotions]);

  const fmtTime = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        timeZone: displayTimezone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }),
    [i18n.language, displayTimezone],
  );
  const fmtHeadWeekday = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, { timeZone: displayTimezone, weekday: "short" }),
    [i18n.language, displayTimezone],
  );
  const fmtHeadDay = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { timeZone: displayTimezone, day: "2-digit" }),
    [i18n.language, displayTimezone],
  );

  // -------- Esqueleto estável (servidor + 1ª hidratação) --------
  if (now === null || !week) {
    return (
      <Card>
        <div
          aria-hidden
          style={{
            height: HEADER_H + TRACK_H + 16,
            borderRadius: 8,
            background:
              "linear-gradient(180deg, #FAFBFB 0%, #F6F6F7 100%)",
            border: `1px solid ${BORDER}`,
          }}
        />
      </Card>
    );
  }

  const todayIndex = week.findIndex((c) => now >= c.startUtc && now < c.endUtc);
  const nowPct =
    todayIndex >= 0
      ? ((now - week[todayIndex].startUtc) /
          (week[todayIndex].endUtc - week[todayIndex].startUtc)) *
        100
      : -1;
  const hasAny = bandsByDay.some((b) => b.length > 0);

  const daysMinWidth = 7 * MIN_COL;

  return (
    <Card>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 12,
          gap: 12,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: INK,
          }}
        >
          {fmtHeadDay.format(week[0].noonUtc)}
          {" – "}
          {fmtHeadDay.format(week[6].noonUtc)}
        </h3>
        <span style={{ fontSize: 12, color: MUTED }}>{displayTimezone}</span>
      </div>

      {!hasAny ? (
        <div
          style={{
            height: TRACK_H * 0.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: MUTED,
            fontSize: 14,
            border: `1px dashed ${BORDER}`,
            borderRadius: 8,
          }}
        >
          {t("timeline.empty")}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", minWidth: GUTTER_W + daysMinWidth }}>
            {/* Eixo de horas */}
            <div style={{ width: GUTTER_W, flex: "0 0 auto" }}>
              <div style={{ height: HEADER_H }} />
              <div style={{ position: "relative", height: TRACK_H }}>
                {HOUR_MARKS.map((h) => {
                  const top = (h / 24) * TRACK_H;
                  const clamp =
                    h === 0
                      ? "translateY(0)"
                      : h === 24
                        ? "translateY(-100%)"
                        : "translateY(-50%)";
                  return (
                    <span
                      key={h}
                      aria-hidden
                      style={{
                        position: "absolute",
                        top,
                        right: 8,
                        transform: clamp,
                        fontSize: 11,
                        fontVariantNumeric: "tabular-nums",
                        color: MUTED,
                        lineHeight: 1,
                      }}
                    >
                      {String(h).padStart(2, "0")}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Dias */}
            <div style={{ position: "relative", flex: 1, minWidth: daysMinWidth }}>
              {/* Cabeçalhos */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {week.map((col, i) => {
                  const isToday = i === todayIndex;
                  return (
                    <div
                      key={i}
                      style={{
                        height: HEADER_H,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        gap: 1,
                        paddingInline: 4,
                        borderLeft: i === 0 ? "none" : `1px solid ${GRID}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: isToday ? NOW : MUTED,
                          fontWeight: 600,
                        }}
                      >
                        {fmtHeadWeekday.format(col.noonUtc)}
                      </span>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: isToday ? 700 : 500,
                          fontVariantNumeric: "tabular-nums",
                          color: isToday ? NOW : INK,
                        }}
                      >
                        {fmtHeadDay.format(col.noonUtc)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Trilhas */}
              <div
                style={{
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  height: TRACK_H,
                  border: `1px solid ${GRID}`,
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                {week.map((col, i) => {
                  const isToday = i === todayIndex;
                  return (
                    <div
                      key={i}
                      style={{
                        position: "relative",
                        borderLeft: i === 0 ? "none" : `1px solid ${GRID}`,
                        background: isToday
                          ? "rgba(44,110,203,0.04)"
                          : "transparent",
                        // linhas de hora a cada 3h
                        backgroundImage: `repeating-linear-gradient(to bottom, ${GRID} 0, ${GRID} 1px, transparent 1px, transparent ${TRACK_H / 8}px)`,
                      }}
                    >
                      {bandsByDay[i].map((b) => {
                        const sw = PALETTE[b.status];
                        const pxH = (b.heightPct / 100) * TRACK_H;
                        const showTime = pxH >= 30;
                        const label = `${b.name} · ${fmtTime.format(b.win.startsAt)}–${fmtTime.format(b.win.endsAt)}`;
                        return (
                          <div
                            key={b.key}
                            title={label}
                            aria-label={`${label} (${t(`status.${b.status}`)})`}
                            style={{
                              position: "absolute",
                              top: `${b.topPct}%`,
                              left: 3,
                              right: 3,
                              height: `max(${b.heightPct}%, 8px)`,
                              background: sw.fill,
                              borderLeft: `3px solid ${sw.rail}`,
                              borderRadius: 6,
                              padding: "2px 6px",
                              overflow: "hidden",
                              boxSizing: "border-box",
                              color: sw.text,
                              fontSize: 11,
                              lineHeight: 1.25,
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {b.name}
                            </div>
                            {showTime ? (
                              <div
                                style={{
                                  opacity: 0.8,
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {fmtTime.format(b.win.startsAt)}–
                                {fmtTime.format(b.win.endsAt)}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Linha do "agora" */}
                {nowPct >= 0 ? (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: `${nowPct}%`,
                      height: 0,
                      borderTop: `2px solid ${NOW}`,
                      pointerEvents: "none",
                      zIndex: 2,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        left: 0,
                        top: -4,
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: NOW,
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: 12,
                        top: -9,
                        background: NOW,
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        padding: "1px 6px",
                        borderRadius: 999,
                        lineHeight: 1.4,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t("timeline.now")}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
