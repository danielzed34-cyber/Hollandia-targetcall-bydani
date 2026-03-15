"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Search } from "lucide-react";
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
  "/dashboard/mentor":    "מנטור AI",
  "/dashboard/service":   "שירות לקוחות",
  "/dashboard/branches":  "מפת סניפים",
  "/dashboard/analytics":     "דוחות BI",
  "/dashboard/admin/users":   "ניהול משתמשים",
  "/dashboard/script":        "תסריט שיחה אישי",
  "/dashboard/admin/scripts": "אישור תסריטי שיחה",
  "/dashboard/admin/shifts":        "סידור עבודה",
  "/dashboard/admin/registrations": "בקשות הרשמה",
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

      {/* Ctrl+K hint button */}
      <button
        id="cmd-palette-trigger"
        className="hidden sm:flex items-center gap-2 h-8 rounded-xl border border-border/60 bg-muted/40 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
        onClick={() => {
          document.dispatchEvent(new KeyboardEvent("keydown", { altKey: true, key: "h", bubbles: true }));
        }}
      >
        <Search className="h-3.5 w-3.5" />
        <span>חיפוש</span>
        <kbd className="ms-1 rounded border border-border/60 bg-background px-1 text-[10px] font-mono">Alt H</kbd>
      </button>

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
