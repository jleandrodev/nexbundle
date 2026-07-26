/**
 * Contagem regressiva ao vivo até um instante ISO. SSR-safe: renderiza um
 * placeholder estável no servidor/primeira hidratação e começa a "tickar" só
 * após montar (evita mismatch de hidratação por diferença de relógio).
 */
import { useEffect, useMemo, useState } from "react";
import { Text } from "@shopify/polaris";

function format(ms: number): string {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export default function Countdown({
  to,
  tone,
}: {
  to: string;
  tone?: "success" | "critical";
}) {
  const target = useMemo(() => new Date(to).getTime(), [to]);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const label = now === null ? "…" : format(target - now);

  return (
    <Text as="span" tone={tone} fontWeight="medium">
      <span style={{ fontVariantNumeric: "tabular-nums" }} suppressHydrationWarning>
        {label}
      </span>
    </Text>
  );
}
