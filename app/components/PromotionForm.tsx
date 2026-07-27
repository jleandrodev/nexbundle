/**
 * Formulário de promoção agendada (criar/editar). Estado local + campos hidden
 * serializados num <Form method="post"> do Remix. A validação forte é no action
 * (parsePromotionForm); aqui damos só o mínimo de UX.
 */
import { useMemo, useState } from "react";
import { Form, useNavigation } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import {
  Banner,
  BlockStack,
  ButtonGroup,
  Button,
  Card,
  Checkbox,
  FormLayout,
  InlineStack,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";

import type { Recurrence } from "../lib/schedule";

export type PromotionFormValue = {
  id?: string;
  name: string;
  enabled: boolean;
  timezone: string;
  recurrence: Recurrence | string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  validFrom: string | null; // yyyy-mm-dd
  validUntil: string | null; // yyyy-mm-dd
};

type Props = {
  mode: "create" | "edit";
  value?: PromotionFormValue;
  defaultTimezone?: string;
  actionError?: string | null;
};

const RECURRENCES: Recurrence[] = ["once", "daily", "weekly"];
// Ordem de exibição seg..dom, mas o VALOR segue 0=dom..6=sáb.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function PromotionForm({
  mode,
  value,
  defaultTimezone,
  actionError,
}: Props) {
  const { t } = useTranslation("promotions");
  const nav = useNavigation();
  const submitting = nav.state === "submitting";

  const [name, setName] = useState(value?.name ?? "");
  const [enabled, setEnabled] = useState(value?.enabled ?? true);
  const [recurrence, setRecurrence] = useState<Recurrence>(
    (value?.recurrence as Recurrence) ?? "daily",
  );
  const [weekdays, setWeekdays] = useState<number[]>(value?.weekdays ?? []);
  const [startTime, setStartTime] = useState(value?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(value?.endTime ?? "18:00");
  const [timezone, setTimezone] = useState(
    value?.timezone ?? defaultTimezone ?? "America/Sao_Paulo",
  );
  const [validFrom, setValidFrom] = useState(value?.validFrom ?? "");
  const [validUntil, setValidUntil] = useState(value?.validUntil ?? "");

  const recurrenceOptions = useMemo(
    () => RECURRENCES.map((r) => ({ label: t(`recurrence.${r}`), value: r })),
    [t],
  );

  const toggleWeekday = (d: number) =>
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b),
    );

  const overnight =
    /^\d{1,2}:\d{2}$/.test(startTime) &&
    /^\d{1,2}:\d{2}$/.test(endTime) &&
    toMinutes(endTime) <= toMinutes(startTime);

  const title = mode === "create" ? t("form.createTitle") : t("form.editTitle");
  const saveLabel = mode === "create" ? t("form.create") : t("form.save");

  return (
    <Page title={title} backAction={{ content: t("form.back"), url: "/app/promotions" }}>
      <Form method="post">
        {/* Campos serializados para o action */}
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="enabled" value={enabled ? "1" : "0"} />
        <input type="hidden" name="recurrence" value={recurrence} />
        <input type="hidden" name="weekdays" value={weekdays.join(",")} />
        <input type="hidden" name="startTime" value={startTime} />
        <input type="hidden" name="endTime" value={endTime} />
        <input type="hidden" name="timezone" value={timezone} />
        <input type="hidden" name="validFrom" value={validFrom} />
        <input type="hidden" name="validUntil" value={validUntil} />

        <BlockStack gap="400">
          {actionError ? (
            <Banner tone="critical">{t(actionError, { defaultValue: t("form.error") })}</Banner>
          ) : null}

          <Card>
            <FormLayout>
              <TextField
                label={t("form.name")}
                value={name}
                onChange={setName}
                autoComplete="off"
                requiredIndicator
              />

              <Checkbox
                label={t("form.enabled")}
                checked={enabled}
                onChange={setEnabled}
              />

              <Select
                label={t("form.recurrence")}
                options={recurrenceOptions}
                value={recurrence}
                onChange={(v) => setRecurrence(v as Recurrence)}
              />

              {recurrence === "weekly" ? (
                <BlockStack gap="150">
                  <Text as="span" variant="bodyMd">
                    {t("form.weekdays")}
                  </Text>
                  <ButtonGroup>
                    {WEEKDAY_ORDER.map((d) => (
                      <Button
                        key={d}
                        pressed={weekdays.includes(d)}
                        onClick={() => toggleWeekday(d)}
                      >
                        {t(`weekday.${d}`)}
                      </Button>
                    ))}
                  </ButtonGroup>
                </BlockStack>
              ) : null}

              <FormLayout.Group>
                <TimeField
                  label={t("form.startTime")}
                  value={startTime}
                  onChange={setStartTime}
                />
                <TimeField
                  label={t("form.endTime")}
                  value={endTime}
                  onChange={setEndTime}
                  helpText={overnight ? t("form.overnightHint") : undefined}
                />
              </FormLayout.Group>

              <TextField
                label={t("form.timezone")}
                value={timezone}
                onChange={setTimezone}
                autoComplete="off"
                helpText={t("form.timezoneHint")}
              />

              <FormLayout.Group>
                <DateField
                  label={t("form.validFrom")}
                  value={validFrom}
                  onChange={setValidFrom}
                />
                <DateField
                  label={t("form.validUntil")}
                  value={validUntil}
                  onChange={setValidUntil}
                />
              </FormLayout.Group>
            </FormLayout>
          </Card>

          <InlineStack align="end" gap="200">
            <Button submit variant="primary" loading={submitting}>
              {saveLabel}
            </Button>
          </InlineStack>
        </BlockStack>
      </Form>

      {/* Excluir: form próprio p/ não colidir com o submit principal. */}
      {mode === "edit" ? (
        <Form
          method="post"
          onSubmit={(e) => {
            if (!confirm(t("form.confirmDelete"))) e.preventDefault();
          }}
        >
          <input type="hidden" name="intent" value="delete" />
          <div style={{ marginTop: "var(--p-space-400)" }}>
            <InlineStack align="end">
              <Button submit variant="tertiary" tone="critical" loading={submitting}>
                {t("form.delete")}
              </Button>
            </InlineStack>
          </div>
        </Form>
      ) : null}
    </Page>
  );
}

function toMinutes(hm: string): number {
  const [h, m] = hm.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

/** Wrapper Polaris-ish em torno de <input type="time"> (HH:mm nativo). */
function TimeField({
  label,
  value,
  onChange,
  helpText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  helpText?: string;
}) {
  return (
    <BlockStack gap="100">
      <Text as="span" variant="bodyMd">
        {label}
      </Text>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
      {helpText ? (
        <Text as="span" variant="bodySm" tone="subdued">
          {helpText}
        </Text>
      ) : null}
    </BlockStack>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <BlockStack gap="100">
      <Text as="span" variant="bodyMd">
        {label}
      </Text>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </BlockStack>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid var(--p-color-border, #8a8a8a)",
  borderRadius: "8px",
  font: "inherit",
  minHeight: "36px",
};
