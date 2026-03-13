"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard":           "ראשי",
  "/dashboard/crm":       "תיאום פגישות",
  "/dashboard/feedback":  "משוב שיחה",
  "/dashboard/hr":        "שעון נוכחות ומשמרות",
  "/dashboard/kb":        "בסיס ידע",
  "/dashboard/mentor":    "מנטור AI",
  "/dashboard/service":   "שירות לקוחות",
  "/dashboard/branches":  "מפת סניפים",
  "/dashboard/analytics":     "דוחות BI",
  "/dashboard/admin/users":   "ניהול משתמשים",
  "/dashboard/script":        "תסריט שיחה אישי",
  "/dashboard/admin/scripts": "אישור תסריטי שיחה",
  "/dashboard/admin/shifts":  "סידור עבודה",
};

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const title = ROUTE_TITLES[pathname] ?? "מערכת הולנדיה";
  const ThemeIcon = mounted
    ? theme === "dark" ? Moon : theme === "light" ? Sun : Monitor
    : Monitor;

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/60 bg-background/80 backdrop-blur-xl px-6 shrink-0">
      <h1 className="flex-1 text-[15px] font-semibold text-foreground tracking-tight truncate">
        {title}
      </h1>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="החלף ערכת נושא"
        >
          <ThemeIcon className="h-4 w-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="me-2 h-4 w-4" />
            בהיר
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="me-2 h-4 w-4" />
            כהה
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Monitor className="me-2 h-4 w-4" />
            מערכת
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
