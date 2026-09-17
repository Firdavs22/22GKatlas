"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import { useAuth } from "@/context/AuthContext";

const PUBLIC_PATHS = ["/login", "/invite", "/forgot", "/reset", "/privacy"];

/** Keep navigation mounted across page transitions, including its scroll position. */
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  if (
    PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(path + "/"),
    )
  )
    return <>{children}</>;
  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar key={user ? user.id + ":" + user.role : "loading"} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
