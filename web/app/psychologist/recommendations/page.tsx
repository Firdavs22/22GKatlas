'use client';
import PageLayout from '@/components/PageLayout';
import RecommendationsManager from '@/components/RecommendationsManager';

const PSYCHOLOGIST_TAGS = ['Важно', 'Эмоции', 'Социализация', 'Адаптация', 'Развитие речи'];

export default function PsychologistRecommendations() {
  return (
    <PageLayout
      eyebrow="Психологические рекомендации"
      title="Рекомендации"
      wide
    >
      <RecommendationsManager
        suggestedTags={PSYCHOLOGIST_TAGS}
        emptyHint="Рекомендаций пока нет"
      />
    </PageLayout>
  );
}
