/**
 * Minimal layout for print pages — no sidebar, no header, white background.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "white", minHeight: "100vh" }}>
      {children}
    </div>
  );
}
