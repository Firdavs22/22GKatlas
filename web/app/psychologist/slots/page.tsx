'use client';
import PageLayout from '@/components/PageLayout';
import SlotsManager from '@/components/SlotsManager';

export default function PsychologistSlots() {
  return (
    <PageLayout
      eyebrow="Открытые окна для родителей"
      title="Запись на приём"
    >
      <SlotsManager />
    </PageLayout>
  );
}
