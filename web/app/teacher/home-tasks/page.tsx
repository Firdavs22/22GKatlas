'use client';
import PageLayout from '@/components/PageLayout';
import RecommendationsManager from '@/components/RecommendationsManager';

const TEACHER_TAGS = ['Дом. практика', 'Презентация', 'Внимание'];

export default function TeacherHomeTasks() {
  return (
    <PageLayout
      eyebrow="Для родителей группы"
      title="Рекомендации"
      wide
    >
      <RecommendationsManager
        showSkillSelect
        suggestedTags={TEACHER_TAGS}
        emptyHint="Активных рекомендаций пока нет"
      />
    </PageLayout>
  );
}
