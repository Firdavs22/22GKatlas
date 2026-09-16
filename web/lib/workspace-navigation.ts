export type WorkspaceItem = {
  href: string;
  label: string;
  kind: "calendar" | "clock" | "library" | "crm";
};

export function workspaceItems(
  role: string,
  modules: Record<string, boolean>,
): WorkspaceItem[] {
  const manager = ["superadmin", "director"].includes(role);
  return [
    ...(modules.team && role !== "parent"
      ? [
          {
            href: "/team/timesheet",
            label: "Мой табель",
            kind: "clock" as const,
          },
          ...(manager
            ? [
                {
                  href: "/team/timesheet/staff",
                  label: "Табели сотрудников",
                  kind: "clock" as const,
                },
              ]
            : []),
          {
            href: "/team/calendar/personal",
            label: "Личный календарь",
            kind: "calendar" as const,
          },
          {
            href: "/team/calendar",
            label: "Общий календарь",
            kind: "calendar" as const,
          },
        ]
      : []),
    ...(modules.library
      ? [
          {
            href: "/library",
            label:
              role === "methodist"
                ? "Кабинет методиста"
                : "Правила и материалы",
            kind: "library" as const,
          },
        ]
      : []),
    ...(modules.crm && (manager || role === "sales_manager")
      ? [{ href: "/crm", label: "CRM · Заявки", kind: "crm" as const }]
      : []),
  ];
}
