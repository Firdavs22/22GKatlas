import SpecialistChildView from '@/components/SpecialistChildView';

const PED_NOTE_TYPES = {
  checkup: 'Осмотр',
  referral: 'Направление',
  vaccination: 'Вакцинация',
  observation: 'Наблюдение',
};

export default function PediatricianChild() {
  return (
    <SpecialistChildView
      noteTypes={PED_NOTE_TYPES}
      defaultType="checkup"
      eyebrow="Карта пациента"
    />
  );
}
