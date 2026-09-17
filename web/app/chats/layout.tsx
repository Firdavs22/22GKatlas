import { ReactNode } from "react";
import StaffChatsLayout from "@/components/StaffChatsLayout";

export default function Layout({ children }: { children: ReactNode }) {
  return <StaffChatsLayout basePath="/chats">{children}</StaffChatsLayout>;
}
