'use client';
import PageLayout from '@/components/PageLayout';
import RecommendationsManager from '@/components/RecommendationsManager';

const PEDIATRIC_TAGS = ['Важно', 'Вакцинация', 'Осмотр', 'Диспансер', 'Питание'];

export default function PediatricianRecommendations() {
  return (
    <PageLayout
      eyebrow="Назначения и напоминания родителям"
      title="Рекомендации"
      wide
    >
      <RecommendationsManager
        suggestedTags={PEDIATRIC_TAGS}
        emptyHint="Рекомендаций пока нет"
      />
    </PageLayout>
  );
}
