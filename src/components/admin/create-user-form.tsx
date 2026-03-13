"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, Eye, EyeOff } from "lucide-react";

interface CreateUserFormProps {
  onCreated?: () => void;
}

export function CreateUserForm({ onCreated }: CreateUserFormProps) {
  const [form, setForm] = useState({ username: "", fullName: "", role: "Rep" as "Admin" | "Rep", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username.trim() || !form.fullName.trim() || !form.password) {
      toast.error("יש למלא את כל השדות");
      return;
    }
    if (form.password.length < 4) {
      toast.error("הסיסמה חייבת להכיל לפחות 4 תווים");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          fullName: form.fullName.trim(),
          role: form.role,
          password: form.password,
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error);
      toast.success(`המשתמש "${form.fullName}" נוצר בהצלחה`);
      setForm({ username: "", fullName: "", role: "Rep", password: "" });
      onCreated?.();
    } catch (err) {
      toast.error("שגיאה ביצירת משתמש", { description: err instanceof Error ? err.message : "נסה שוב" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          הוסף משתמש חדש
        </CardTitle>
        <CardDescription>
          שם המשתמש יהפוך לכתובת: <span dir="ltr" className="font-mono text-xs">username@hollandia.internal</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cu-username">שם משתמש *</Label>
              <Input
                id="cu-username"
                placeholder="yossi.cohen"
                dir="ltr"
                value={form.username}
                onChange={(e) => set("username", e.target.value.toLowerCase().replace(/\s/g, ""))}
                disabled={loading}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-fullName">שם מלא *</Label>
              <Input
                id="cu-fullName"
                placeholder="יוסי כהן"
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cu-role">תפקיד *</Label>
              <select
                id="cu-role"
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                disabled={loading}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/30"
              >
                <option value="Rep">נציג (Rep)</option>
                <option value="Admin">מנהל (Admin)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cu-password">סיסמה *</Label>
              <div className="relative">
                <Input
                  id="cu-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="לפחות 6 תווים"
                  dir="ltr"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  disabled={loading}
                  required
                  className="pe-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {loading ? "יוצר..." : "צור משתמש"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
