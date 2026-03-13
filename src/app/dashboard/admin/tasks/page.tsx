import { TasksManager } from "@/components/admin/tasks-manager";
import { BroadcastSender } from "@/components/admin/broadcast-sender";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare, Megaphone } from "lucide-react";

export default function AdminTasksPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">משימות והודעות</h1>
        <p className="text-sm text-muted-foreground mt-1">
          הגדר משימות לנציגים ושלח הודעות לצוות
        </p>
      </div>

      <Tabs defaultValue="tasks" dir="rtl">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="tasks" className="gap-2">
            <CheckSquare className="h-4 w-4" />
            משימות
          </TabsTrigger>
          <TabsTrigger value="broadcasts" className="gap-2">
            <Megaphone className="h-4 w-4" />
            הודעות
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-6">
          <TasksManager />
        </TabsContent>

        <TabsContent value="broadcasts" className="mt-6">
          <BroadcastSender />
        </TabsContent>
      </Tabs>
    </div>
  );
}
