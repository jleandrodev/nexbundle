/** Campo de cor: swatch nativo (input color) + TextField com o hex. */
import { InlineStack, TextField } from "@shopify/polaris";

export default function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <InlineStack gap="300" blockAlign="center" wrap={false}>
      <label
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.15)",
          flex: "0 0 auto",
          cursor: "pointer",
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 56,
            height: 56,
            margin: -8,
            border: "none",
            padding: 0,
            background: "none",
            cursor: "pointer",
          }}
        />
      </label>
      <div style={{ flex: 1 }}>
        <TextField label={label} value={value} onChange={onChange} autoComplete="off" />
      </div>
    </InlineStack>
  );
}
