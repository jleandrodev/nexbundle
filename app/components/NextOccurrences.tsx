/**
 * Formatação de janelas de promoção (data + faixa de horário) no fuso e idioma dados.
 * describeWindow é pura (sem React) — usada no dashboard e onde precisar descrever
 * uma ocorrência. Ex.: "ter, 20/02 · 14:00–18:00".
 */

export function describeWindow(
  start: Date,
  end: Date,
  timezone: string,
  locale: string,
): string {
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(start);

  const time = (d: Date) =>
    new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(d);

  return `${date} · ${time(start)}–${time(end)}`;
}
