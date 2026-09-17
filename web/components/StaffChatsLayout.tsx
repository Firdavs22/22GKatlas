import { ReactNode } from "react";
import ChatsLayout from "@/components/ChatsLayout";

const labels = {
  teacher: "Педагоги",
  psychologist: "Психологи",
  pediatrician: "Педиатры",
  methodist: "Методисты",
  admin: "Администраторы",
  director: "Директора",
  superadmin: "Главные администраторы",
  sales_manager: "Менеджеры продаж",
  parent: "Родители",
};

export default function StaffChatsLayout({
  children,
  basePath,
}: {
  children: ReactNode;
  basePath: string;
}) {
  return (
    <ChatsLayout
      basePath={basePath}
      eyebrow="Коллеги · Родители"
      roleLabels={labels}
      pickerRoleLabels={labels}
      pickerRoleOrder={Object.keys(labels)}
      chatTypeByRole={{}}
      defaultChatType="staff_staff"
      pickerEmptyHint="Пока нет доступных контактов"
    >
      {children}
    </ChatsLayout>
  );
}
