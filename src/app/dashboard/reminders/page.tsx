import { RemindersPanel } from "@/components/crm/reminders-panel";

export default function RemindersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">תזכורות WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          שליחת תזכורות ללקוחות עם פגישות היום ומחר
        </p>
      </div>
      <RemindersPanel />
    </div>
  );
}
