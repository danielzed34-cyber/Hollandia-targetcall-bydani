"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { ProductivityWidget } from "./productivity-widget";
import {
  LayoutDashboard,
  CalendarPlus,
  Mic2,
  Clock,
  BarChart3,
  BookOpen,
  Bot,
  Headphones,
  MapPin,
  LogOut,
  Users,
  Settings,
  CalendarClock,
  ScrollText,
  CheckSquare,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "ראשי",            href: "/dashboard",            icon: LayoutDashboard },
  { label: "תיאום פגישות",   href: "/dashboard/crm",        icon: CalendarPlus    },
  { label: "תזכורות",        href: "/dashboard/reminders",  icon: MessageCircle   },
  { label: "משוב שיחה",      href: "/dashboard/feedback",   icon: Mic2            },
  { label: "שעון נוכחות",    href: "/dashboard/hr",         icon: Clock           },
  { label: "בסיס ידע",       href: "/dashboard/kb",         icon: BookOpen        },
  { label: "מנטור AI",       href: "/dashboard/mentor",     icon: Bot             },
  { label: "שירות לקוחות",   href: "/dashboard/service",    icon: Headphones      },
  { label: "מפת סניפים",     href: "/dashboard/branches",   icon: MapPin          },
  { label: "תסריט שיחה",     href: "/dashboard/script",     icon: ScrollText      },
  { label: "דוחות BI",       href: "/dashboard/analytics",   icon: BarChart3, adminOnly: true },
  { label: "ניהול משתמשים",  href: "/dashboard/admin/users",    icon: Users,         adminOnly: true },
  { label: "נוכחות כולם",    href: "/dashboard/admin/hr",       icon: CalendarClock, adminOnly: true },
  { label: "אישור תסריטים",  href: "/dashboard/admin/scripts",  icon: CheckSquare,   adminOnly: true },
  { label: "סידור עבודה",    href: "/dashboard/admin/shifts",   icon: CalendarClock, adminOnly: true },
  { label: "משימות והודעות", href: "/dashboard/admin/tasks",    icon: CheckSquare,   adminOnly: true },
  { label: "הגדרות מנטור",   href: "/dashboard/admin/settings",  icon: Settings,        adminOnly: true },
  { label: "WhatsApp",       href: "/dashboard/admin/whatsapp",  icon: MessageCircle,   adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, role, signOut } = useAuth();

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "?";

  async function handleSignOut() {
    await signOut();
    toast.success("התנתקת בהצלחה");
    router.push("/login");
    router.refresh();
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || role === "Admin"
  );

  return (
    <aside
      className="flex h-full w-64 shrink-0 flex-col"
      style={{
        background: "linear-gradient(180deg, #060D1F 0%, #0A1530 55%, #0D1A38 100%)",
        borderInlineStart: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* ── Brand ──────────────────────────────────────────── */}
      <div
        className="flex h-[60px] items-center px-4 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/targetcall-logo.png"
          alt="targetcall"
          className="h-62 w-auto object-contain py-0 pointer-events-none"
          style={{ transform: "translateY(0%)" }}
        />
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {visibleItems.map((item, index) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          const isFirstAdmin =
            item.adminOnly && (index === 0 || !visibleItems[index - 1]?.adminOnly);

          return (
            <div key={item.href}>
              {/* Admin section divider */}
              {isFirstAdmin && (
                <div className="mt-3 mb-1.5 px-2">
                  <p
                    className="text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: "#ffffff" }}
                  >
                    ניהול
                  </p>
                </div>
              )}

              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-[9px] text-[13px] font-medium",
                  "transition-all duration-150",
                  isActive
                    ? "font-semibold text-white"
                    : "hover:text-[#C8D4E8] hover:bg-white/[0.04]"
                )}
                style={
                  isActive
                    ? {
                        background: "rgba(10,126,255,0.14)",
                        boxShadow: "0 0 0 1px rgba(10,126,255,0.24)",
                        color: "#ffffff",
                      }
                    : { color: "#7A9DC0" }
                }
              >
                <Icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: isActive ? "#4FA8FF" : undefined }}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {isActive && (
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{
                      background: "#4FA8FF",
                      boxShadow: "0 0 8px #4FA8FF, 0 0 3px #4FA8FF",
                    }}
                  />
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* ── Productivity Widget ─────────────────────────────── */}
      <ProductivityWidget />

      {/* ── User Footer ────────────────────────────────────── */}
      <div
        className="p-3 shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-colors hover:bg-white/[0.04]">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback
              className="text-xs font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #1A3A6A 0%, #0D2242 100%)",
              }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate leading-tight">
              {profile?.nickname ?? profile?.full_name ?? "..."}
            </p>
            <p className="text-[11px] font-medium" style={{ color: "#2E4A6A" }}>
              {role === "Admin" ? "מנהל" : "נציג"}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            title="התנתק"
            className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-white/[0.07] hover:text-[#8BA8CC]"
            style={{ color: "#2E4A6A" }}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
