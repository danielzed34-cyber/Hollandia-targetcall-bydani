"use client";

import type { PrintTemplate } from "./print-view";

const TEMPLATES: { value: PrintTemplate; label: string; desc: string }[] = [
  { value: "classic", label: "קלאסי",   desc: "כחול, מסורתי" },
  { value: "modern",  label: "מודרני",  desc: "נייבי וזהב" },
  { value: "compact", label: "קומפקטי", desc: "מינימלי, דחוס" },
];

interface Props {
  template: PrintTemplate;
  onTemplateChange: (t: PrintTemplate) => void;
}

export function PrintToolbar({ template, onTemplateChange }: Props) {
  return (
    <div
      className="no-print"
      style={{
        padding: "12px 20px",
        background: "#F3F4F6",
        borderBottom: "1px solid #E5E7EB",
        display: "flex",
        gap: "16px",
        alignItems: "center",
        flexWrap: "wrap",
        direction: "rtl",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 600 }}>עיצוב:</span>
        <div style={{ display: "flex", gap: "6px" }}>
          {TEMPLATES.map((t) => (
            <button
              key={t.value}
              onClick={() => onTemplateChange(t.value)}
              style={{
                padding: "5px 14px",
                borderRadius: "8px",
                border: template === t.value ? "2px solid #0A7EFF" : "1px solid #D1D5DB",
                background: template === t.value ? "#EFF6FF" : "#fff",
                color: template === t.value ? "#0A7EFF" : "#6B7280",
                fontWeight: template === t.value ? 700 : 400,
                fontSize: "13px",
                cursor: "pointer",
              }}
              title={t.desc}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: "1px", height: "24px", background: "#D1D5DB" }} />

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={() => window.print()}
          style={{ padding: "8px 20px", background: "#0A7EFF", color: "white", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}
        >
          הדפס
        </button>
        <button
          onClick={() => window.close()}
          style={{ padding: "8px 16px", background: "transparent", color: "#6B7280", border: "1px solid #E5E7EB", borderRadius: "8px", cursor: "pointer", fontSize: "14px" }}
        >
          סגור
        </button>
      </div>
    </div>
  );
}
