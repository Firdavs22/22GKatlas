import ChatsLayout from '@/components/ChatsLayout';

const ROLE_LABEL: Record<string, string> = {
  parent: 'родитель',
  teacher: 'педагог',
  pediatrician: 'педиатр',
  admin: 'администрация',
};

const PICKER_LABEL: Record<string, string> = {
  parent: 'Родители',
  teacher: 'Педагоги',
  pediatrician: 'Педиатры',
  admin: 'Администрация',
};

export default function PsychologistChatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatsLayout
      basePath="/psychologist/chats"
      eyebrow="С педагогами и родителями"
      roleLabels={ROLE_LABEL}
      pickerRoleOrder={['parent', 'teacher']}
      pickerRoleLabels={PICKER_LABEL}
      chatTypeByRole={{
        teacher: 'teacher_psychologist',
        parent: 'psychologist_parent',
      }}
      defaultChatType="psychologist_parent"
      pickerEmptyHint="Нет назначенных детей — обратитесь к администратору"
    >
      {children}
    </ChatsLayout>
  );
}
