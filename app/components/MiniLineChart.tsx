/**
 * Gráfico de linhas/área inline (SVG, sem dependências). Duas séries na MESMA
 * unidade (contagens) → um único eixo Y. Legenda presente; cores CVD-distintas.
 */
import { useTranslation } from "react-i18next";

export type DailyPoint = { day: string; impressions: number; clicks: number };

const SERIES = [
  { key: "impressions" as const, color: "#3D5AFE" },
  { key: "clicks" as const, color: "#F59E0B" },
];

const INK = "#6B7280";
const GRID = "#E5E7EB";

function fmtDay(d: string) {
  return d.slice(5).replace("-", "/"); // MM/DD
}

export default function MiniLineChart({ data }: { data: DailyPoint[] }) {
  const { t } = useTranslation("analytics");
  const W = 720;
  const H = 260;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = data.length;

  const max = Math.max(
    1,
    ...data.map((d) => Math.max(d.impressions, d.clicks)),
  );
  const x = (i: number) => (n <= 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW);
  const y = (v: number) => padT + plotH - (v / max) * plotH;

  const yTicks = [0, Math.round(max / 2), max];

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={t("chartTitle")}
        style={{ display: "block", minWidth: 480 }}
      >
        {/* grade + rótulos Y */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill={INK}>
              {t}
            </text>
          </g>
        ))}

        {/* séries */}
        {SERIES.map((s) => {
          const pts = data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(" ");
          const area =
            n >= 2
              ? `M ${x(0)},${y(0)} L ${data
                  .map((d, i) => `${x(i)},${y(d[s.key])}`)
                  .join(" L ")} L ${x(n - 1)},${y(0)} Z`
              : "";
          return (
            <g key={s.key}>
              {n >= 2 ? <path d={area} fill={s.color} opacity={0.08} /> : null}
              {n >= 2 ? (
                <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              ) : null}
              {data.map((d, i) => (
                <circle key={i} cx={x(i)} cy={y(d[s.key])} r={n <= 14 ? 3 : 0} fill={s.color} />
              ))}
            </g>
          );
        })}

        {/* rótulos X (primeiro, meio, último) */}
        {[0, Math.floor((n - 1) / 2), n - 1]
          .filter((v, i, a) => n > 0 && a.indexOf(v) === i)
          .map((i) => (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill={INK}>
              {fmtDay(data[i].day)}
            </text>
          ))}
      </svg>

      {/* legenda */}
      <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8 }}>
        {SERIES.map((s) => (
          <div key={s.key} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: s.color,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 13, color: "#374151" }}>{t(`chartSeries.${s.key}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
