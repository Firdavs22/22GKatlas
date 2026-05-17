import ChatsLayout from '@/components/ChatsLayout';

const ROLE_LABEL: Record<string, string> = {
  parent: 'родитель',
  teacher: 'педагог',
  psychologist: 'психолог',
  admin: 'администрация',
};

const PICKER_LABEL: Record<string, string> = {
  parent: 'Родители',
  teacher: 'Педагоги',
  psychologist: 'Психологи',
  admin: 'Администрация',
};

export default function PediatricianChatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatsLayout
      basePath="/pediatrician/chats"
      eyebrow="С родителями и педагогами"
      roleLabels={ROLE_LABEL}
      pickerRoleOrder={['parent', 'teacher']}
      pickerRoleLabels={PICKER_LABEL}
      chatTypeByRole={{
        teacher: 'teacher_parent',
        parent: 'pediatrician_parent',
      }}
      defaultChatType="pediatrician_parent"
      pickerEmptyHint="Нет назначенных детей — обратитесь к администратору"
    >
      {children}
    </ChatsLayout>
  );
}
