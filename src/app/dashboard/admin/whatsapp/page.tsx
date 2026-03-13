import { WhatsAppPanel } from "@/components/admin/whatsapp-panel";

export default function WhatsAppPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">ניהול WhatsApp</h1>
        <p className="text-sm text-muted-foreground">חיבור WhatsApp וניהול שליחת הודעות אוטומטיות</p>
      </div>
      <WhatsAppPanel />
    </div>
  );
}
