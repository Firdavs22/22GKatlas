import ChatsLayout from '@/components/ChatsLayout';

const ROLE_LABEL: Record<string, string> = {
  teacher: 'педагог группы',
  pediatrician: 'педиатр',
  psychologist: 'психолог',
  admin: 'администрация',
};

const PICKER_LABEL: Record<string, string> = {
  teacher: 'Педагог',
  pediatrician: 'Педиатр',
  psychologist: 'Психолог',
  admin: 'Администрация',
};

export default function ParentChatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatsLayout
      basePath="/parent/chats"
      eyebrow="Общение с педагогами и специалистами"
      roleLabels={ROLE_LABEL}
      pickerRoleOrder={['teacher', 'pediatrician', 'psychologist', 'admin']}
      pickerRoleLabels={PICKER_LABEL}
      chatTypeByRole={{
        pediatrician: 'pediatrician_parent',
        psychologist: 'psychologist_parent',
        teacher: 'teacher_parent',
        admin: 'teacher_parent',
      }}
      defaultChatType="teacher_parent"
      pickerEmptyHint="Сотрудники не назначены"
    >
      {children}
    </ChatsLayout>
  );
}
