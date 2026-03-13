import { ScriptsReview } from "@/components/admin/scripts-review";

export default function AdminScriptsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-black tracking-tight">אישור תסריטי שיחה</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          סקור ואשר תסריטים שנשלחו על ידי הנציגים
        </p>
      </div>
      <ScriptsReview />
    </div>
  );
}
