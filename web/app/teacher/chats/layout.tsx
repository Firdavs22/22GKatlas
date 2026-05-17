import ChatsLayout from '@/components/ChatsLayout';

const ROLE_LABEL: Record<string, string> = {
  parent: 'родитель',
  pediatrician: 'педиатр',
  psychologist: 'психолог',
  admin: 'администрация',
};

const PICKER_LABEL: Record<string, string> = {
  parent: 'Родители',
  psychologist: 'Психологи',
  pediatrician: 'Педиатры',
  admin: 'Администрация',
};

export default function TeacherChatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatsLayout
      basePath="/teacher/chats"
      eyebrow="Родители · специалисты"
      roleLabels={ROLE_LABEL}
      pickerRoleOrder={['parent', 'psychologist', 'pediatrician']}
      pickerRoleLabels={PICKER_LABEL}
      chatTypeByRole={{
        psychologist: 'teacher_psychologist',
        pediatrician: 'pediatrician_parent',
        parent: 'teacher_parent',
      }}
      defaultChatType="teacher_parent"
      pickerEmptyHint="В группе пока нет контактов"
    >
      {children}
    </ChatsLayout>
  );
}
