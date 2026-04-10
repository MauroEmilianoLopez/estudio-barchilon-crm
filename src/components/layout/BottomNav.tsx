"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Briefcase,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Inicio", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/contacts", label: "Clientes", icon: Users },
  { href: "/deals", label: "Casos", icon: Briefcase },
  { href: "/agenda", label: "Agenda", icon: CalendarClock },
];

export function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const nav = (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card"
      style={{ zIndex: 9999 }}
    >
      <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom,0px)]">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] py-2 text-[11px] font-medium transition-colors active:bg-muted/50",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );

  if (!mounted) return nav;

  return createPortal(nav, document.body);
}
