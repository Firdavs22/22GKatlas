'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import { Card, SectionLabel } from '@/components/ui';
import api from '@/lib/api';

interface ZoneItem {
  n: string;
  title: string;
  desc: string;
  accent: string;
}

interface StageItem {
  label: string;
  desc: string;
}

interface AboutContent {
  intro: string;
  zones: ZoneItem[];
  stages: StageItem[];
}

const DEFAULT_ABOUT: AboutContent = {
  intro:
    'Среда устроена так, чтобы ребёнок мог сам выбирать материал, работать в своём темпе и осваивать навыки в естественной последовательности. Педагог — наблюдатель и проводник.',
  zones: [
    {
      n: '01',
      title: 'Практическая жизнь',
      desc: 'Уход за собой, уход за средой, контроль движений. Основа всего — формирует независимость и концентрацию.',
      accent: 'text-success',
    },
    {
      n: '02',
      title: 'Сенсорика',
      desc: 'Изоляция качеств: размер, форма, цвет, текстура, запах, звук. Материалы изолируют по одному признаку.',
      accent: 'text-success',
    },
    {
      n: '03',
      title: 'Математика',
      desc: 'Конкретное → абстрактное. Веретёна, числовые штанги, золотой материал, бусины.',
      accent: 'text-brand-soft',
    },
    {
      n: '04',
      title: 'Язык',
      desc: 'Обогащение словаря, шероховатые буквы, подвижный алфавит, чтение и письмо.',
      accent: 'text-warn',
    },
    {
      n: '05',
      title: 'Космос',
      desc: 'Природа, география, история, биология. Ребёнок учится понимать мир и своё место в нём.',
      accent: 'text-danger',
    },
  ],
  stages: [
    { label: 'Не начат', desc: 'Презентация ещё не проводилась.' },
    { label: 'Знакомство', desc: 'Педагог провёл первое знакомство с материалом.' },
    { label: 'Повторение', desc: 'Ребёнок практикуется самостоятельно.' },
    { label: 'Усвоено', desc: 'Уверенно демонстрирует навык в работе.' },
  ],
};

export default function AboutPage() {
  const [about, setAbout] = useState<AboutContent>(DEFAULT_ABOUT);

  useEffect(() => {
    api.get('/site-content/about')
      .then(r => {
        const data = r.data;
        if (data && (data.intro || data.zones || data.stages)) {
          setAbout({
            intro: data.intro || DEFAULT_ABOUT.intro,
            zones: Array.isArray(data.zones) && data.zones.length ? data.zones : DEFAULT_ABOUT.zones,
            stages: Array.isArray(data.stages) && data.stages.length ? data.stages : DEFAULT_ABOUT.stages,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <PageLayout eyebrow="Принципы и зоны развития" title="О нашей системе">
      <p className="font-serif text-xl text-slate-700 leading-relaxed max-w-3xl mb-8 whitespace-pre-line">
        {about.intro}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {about.zones.map(zone => (
          <Card key={zone.n} padding="md">
            <div className="relative">
              <span
                className={`absolute right-0 top-0 font-serif text-6xl leading-none ${zone.accent || 'text-brand-soft'} opacity-30 select-none`}
              >
                {zone.n}
              </span>
              <div className="pr-16">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Зона {zone.n}
                </div>
                <h3 className="font-serif text-2xl mb-2">{zone.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{zone.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-4">
        <SectionLabel>Стадии освоения навыка</SectionLabel>
        <h2 className="font-serif text-3xl mt-1">
          Как мы видим <span className="italic">прогресс</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {about.stages.map((s, i) => (
          <Card key={`${s.label}-${i}`} padding="md">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Стадия {i + 1}
            </div>
            <div className="font-serif text-xl mb-2">{s.label}</div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{s.desc}</p>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
