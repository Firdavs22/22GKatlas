import ChatThread from '@/components/ChatThread';

export default function TeacherChatPage() {
  return <ChatThread backHref="/teacher/chats" eyebrow="Чат с родителем" allowAttachments />;
}
