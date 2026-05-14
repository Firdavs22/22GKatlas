import ChatThread from '@/components/ChatThread';

export default function ParentChatPage() {
  return <ChatThread backHref="/parent/chats" eyebrow="Чат с педагогом" />;
}
