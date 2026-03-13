import { Timeclock } from "@/components/hr/timeclock";
import { LiveBreaks } from "@/components/hr/live-breaks";
import { ShiftForm } from "@/components/hr/shift-form";

export default function HRPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left column: clock + breaks */}
      <div className="flex flex-col gap-6">
        <Timeclock />
        <LiveBreaks />
      </div>

      {/* Right columns: shift constraints */}
      <div className="lg:col-span-2">
        <ShiftForm />
      </div>
    </div>
  );
}
