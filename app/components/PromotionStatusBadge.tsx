/** Badge de status da promoção (live/scheduled/paused/error/ended). */
import { Badge } from "@shopify/polaris";
import { useTranslation } from "react-i18next";

import type { PromotionStatus } from "../lib/schedule";

const TONE: Record<PromotionStatus, "success" | "attention" | "critical" | "info" | undefined> = {
  live: "success",
  scheduled: "attention",
  paused: undefined,
  error: "critical",
  ended: "info",
};

export default function PromotionStatusBadge({ status }: { status: PromotionStatus }) {
  const { t } = useTranslation("promotions");
  return <Badge tone={TONE[status]}>{t(`status.${status}`)}</Badge>;
}
