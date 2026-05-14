import SpecialistChildView from '@/components/SpecialistChildView';

const PSY_NOTE_TYPES = {
  observation: 'Наблюдение',
  diagnosis: 'Диагностика',
  recommendation: 'Рекомендация',
  plan: 'План работы',
};

export default function PsychologistChild() {
  return (
    <SpecialistChildView
      noteTypes={PSY_NOTE_TYPES}
      defaultType="observation"
      eyebrow="Карта подопечного"
    />
  );
}
