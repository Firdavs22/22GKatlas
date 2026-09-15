"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
export default function WorkspaceNav() {
  const { user } = useAuth();
  const path = usePathname();
  const [modules, setModules] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (user)
      api
        .get("/modules")
        .then((r) => setModules(r.data))
        .catch(() => {});
  }, [user?.id]);
  if (!user) return null;
  const staff = user.role !== "parent";
  const items = [
    ...(modules.team && staff
      ? [
          ["/team/calendar", "Календарь команды"],
          ["/team/timesheet", "Табель"],
        ]
      : []),
    ...(modules.library
      ? [
          [
            "/library",
            user.role === "methodist"
              ? "Кабинет методиста"
              : "Правила и материалы",
          ],
        ]
      : []),
    ...(modules.crm && ["admin", "superadmin", "director"].includes(user.role)
      ? [["/crm", "CRM · Заявки"]]
      : []),
  ];
  if (!items.length) return null;
  return (
    <nav aria-label="Рабочие разделы" className="flex flex-wrap gap-2 mb-6">
      {items.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          className={
            "rounded-full border px-4 py-2 text-sm " +
            (path === href
              ? "bg-brand text-white border-brand"
              : "bg-white border-slate-200 text-slate-700 hover:border-brand")
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
