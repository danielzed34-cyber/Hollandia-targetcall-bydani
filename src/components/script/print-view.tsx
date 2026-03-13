"use client";

export type PrintTemplate = "classic" | "modern" | "compact";

interface CallScript {
  id: string;
  rep_name: string;
  section_1: string;
  section_2: string;
  section_3: string;
  section_4: string;
  section_5: string;
  section_6: string;
  updated_at: string;
}

const SECTIONS = [
  { key: "section_1" as const, title: "פתיחת השיחה" },
  { key: "section_2" as const, title: "התחברות רגשית" },
  { key: "section_3" as const, title: "הצגת הערך והחשיבות" },
  { key: "section_4" as const, title: "הצגת ההטבה" },
  { key: "section_5" as const, title: "קביעת פגישה" },
  { key: "section_6" as const, title: "סיכום השיחה" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

/* ─────────────────────────────────────────────────────── Classic ── */
function ClassicView({ script }: { script: CallScript }) {
  return (
    <div dir="rtl" style={{ fontFamily: "Arial, Helvetica, sans-serif", maxWidth: "720px", margin: "0 auto", padding: "40px 32px", color: "#1a1a1a", lineHeight: "1.6" }}>
      <div style={{ borderBottom: "3px solid #0A7EFF", paddingBottom: "20px", marginBottom: "28px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "24px" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #0A7EFF 0%, #0044CC 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: "16px" }}>H</div>
            <span style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "-0.02em", color: "#0A1530" }}>הולנדיה</span>
          </div>
          <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>מזרנים, מיטות וריהוט חדר שינה</p>
        </div>
        <div style={{ textAlign: "left" }}>
          <p style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "#0A1530" }}>תסריט שיחה אישי</p>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6b7280" }}>נציג: {script.rep_name}</p>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>תאריך: {formatDate(script.updated_at)}</p>
        </div>
      </div>

      <div style={{ background: "#EFF6FF", borderRadius: "10px", padding: "14px 18px", marginBottom: "28px", borderRight: "4px solid #0A7EFF" }}>
        <p style={{ margin: 0, fontSize: "13px", color: "#1e40af" }}>
          <strong>הנחיה כללית:</strong> קרא/י את התסריט באופן טבעי, הוסף/י אנרגיה אישית ושמור/י על תחושה שוטפת ואנושית. אין צורך לדקלם מילה במילה.
        </p>
      </div>

      {SECTIONS.map((section, i) => (
        <div key={section.key} style={{ marginBottom: "28px", pageBreakInside: "avoid" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "linear-gradient(135deg, #0A7EFF 0%, #0044CC 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "13px", flexShrink: 0 }}>{i + 1}</div>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0A1530", letterSpacing: "-0.01em" }}>{section.title}</h2>
          </div>
          <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: "10px", padding: "16px 18px", fontSize: "14px", color: "#374151", whiteSpace: "pre-wrap", lineHeight: "1.75", minHeight: "60px" }}>
            {script[section.key] || <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>—</span>}
          </div>
        </div>
      ))}

      <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "20px", marginTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#9CA3AF" }}>
        <span>© הולנדיה — מסמך פנימי בלבד</span>
        <span>מאושר על ידי מנהל</span>
      </div>

      <style>{`@media print { @page { margin: 20mm 15mm; size: A4; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── Modern ─── */
function ModernView({ script }: { script: CallScript }) {
  return (
    <div dir="rtl" style={{ fontFamily: "Arial, Helvetica, sans-serif", maxWidth: "720px", margin: "0 auto", color: "#1a1a1a", lineHeight: "1.6" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0A1530 0%, #0D2045 100%)", color: "#fff", padding: "28px 36px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: "linear-gradient(135deg, #C9A84C 0%, #F0C84A 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "18px", color: "#0A1530" }}>H</div>
          <div>
            <p style={{ margin: 0, fontSize: "20px", fontWeight: 900, letterSpacing: "-0.02em" }}>הולנדיה</p>
            <p style={{ margin: 0, fontSize: "11px", color: "#7A9AC0", letterSpacing: "0.12em", textTransform: "uppercase" }}>מזרנים · מיטות · ריהוט חדר שינה</p>
          </div>
        </div>
        <div style={{ textAlign: "left" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#7A9AC0" }}>תסריט שיחה אישי</p>
          <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 700 }}>{script.rep_name}</p>
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#7A9AC0" }}>{formatDate(script.updated_at)}</p>
        </div>
      </div>

      {/* Gold divider */}
      <div style={{ height: "3px", background: "linear-gradient(90deg, #C9A84C 0%, #F0C84A 60%, transparent 100%)" }} />

      <div style={{ padding: "32px 36px" }}>
        <div style={{ background: "#FFF8E8", borderRight: "3px solid #C9A84C", padding: "12px 16px", marginBottom: "28px", borderRadius: "0 6px 6px 0", fontSize: "13px", color: "#7a5c00" }}>
          קרא/י את התסריט באופן טבעי ואנושי — זו מסגרת, לא תסריט מילולי.
        </div>

        {SECTIONS.map((section, i) => (
          <div key={section.key} style={{ marginBottom: "24px", pageBreakInside: "avoid" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#0A1530", display: "flex", alignItems: "center", justifyContent: "center", color: "#C9A84C", fontWeight: 900, fontSize: "12px", flexShrink: 0 }}>{i + 1}</div>
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#0A1530" }}>{section.title}</h2>
              <div style={{ flex: 1, height: "1px", background: "#E5E7EB" }} />
            </div>
            <div style={{ paddingRight: "38px", fontSize: "14px", color: "#374151", whiteSpace: "pre-wrap", lineHeight: "1.75", minHeight: "50px" }}>
              {script[section.key] || <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>—</span>}
            </div>
          </div>
        ))}

        <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#9CA3AF" }}>
          <span>© הולנדיה — מסמך פנימי בלבד</span>
          <span>מאושר על ידי מנהל</span>
        </div>
      </div>

      <style>{`@media print { @page { margin: 15mm 12mm; size: A4; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── Compact ── */
function CompactView({ script }: { script: CallScript }) {
  return (
    <div dir="rtl" style={{ fontFamily: "Arial, Helvetica, sans-serif", maxWidth: "720px", margin: "0 auto", padding: "24px 28px", color: "#1a1a1a", lineHeight: "1.5" }}>
      {/* Single-line header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "2px solid #1a1a1a", paddingBottom: "10px", marginBottom: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px", fontWeight: 900, letterSpacing: "-0.01em" }}>הולנדיה</span>
          <span style={{ color: "#9CA3AF" }}>|</span>
          <span style={{ fontSize: "13px", fontWeight: 600 }}>תסריט שיחה</span>
        </div>
        <div style={{ fontSize: "12px", color: "#6b7280", display: "flex", gap: "16px" }}>
          <span>נציג: <strong>{script.rep_name}</strong></span>
          <span>{formatDate(script.updated_at)}</span>
        </div>
      </div>

      {/* Sections in compact grid */}
      {SECTIONS.map((section, i) => (
        <div key={section.key} style={{ marginBottom: "14px", pageBreakInside: "avoid", border: "1px solid #E5E7EB", borderRadius: "6px", padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "5px" }}>
            <span style={{ fontSize: "11px", fontWeight: 900, color: "#6b7280", minWidth: "14px" }}>{i + 1}.</span>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#0A1530" }}>{section.title}</span>
          </div>
          <div style={{ fontSize: "13px", color: "#374151", whiteSpace: "pre-wrap", lineHeight: "1.6", paddingRight: "22px" }}>
            {script[section.key] || <span style={{ color: "#9CA3AF", fontStyle: "italic" }}>—</span>}
          </div>
        </div>
      ))}

      <div style={{ marginTop: "12px", fontSize: "10px", color: "#9CA3AF", textAlign: "center" }}>
        הולנדיה — מסמך פנימי | מאושר על ידי מנהל | {formatDate(script.updated_at)}
      </div>

      <style>{`@media print { @page { margin: 12mm 10mm; size: A4; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
    </div>
  );
}

/* ──────────────────────────────────────────────── Main export ─── */
export function PrintView({ script, template = "classic" }: { script: CallScript; template?: PrintTemplate }) {
  if (template === "modern")  return <ModernView script={script} />;
  if (template === "compact") return <CompactView script={script} />;
  return <ClassicView script={script} />;
}
