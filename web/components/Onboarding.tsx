'use client';
import { useState } from 'react';

const SLIDES = [
  {
    icon: '🗺️',
    title: 'Карта развития ребёнка',
    text: 'ГлобоАтлас отслеживает развитие по 5 зонам Монтессори: Практическая жизнь, Сенсорика, Математика, Язык и Космос. Вы видите не оценки, а путь.',
  },
  {
    icon: '🎨',
    title: 'Что означают цвета',
    items: [
      { color: 'bg-gray-100 text-gray-400', label: '—', desc: 'Не начат — презентация ещё не проводилась' },
      { color: 'bg-yellow-100 text-yellow-700', label: 'ЗН', desc: 'Знакомство — педагог провёл презентацию' },
      { color: 'bg-blue-100 text-blue-700', label: 'ПВ', desc: 'Повторение — ребёнок практикуется самостоятельно' },
      { color: 'bg-green-100 text-green-700', label: 'УС', desc: 'Усвоено — уверенно проявляет навык' },
    ],
  },
  {
    icon: '💬',
    title: 'Вы часть команды',
    text: 'Через чат вы общаетесь с педагогом по развитию. Педагог оставляет наблюдения — короткие заметки о том, что происходит в группе. Домашние задания помогут поддержать прогресс дома.',
  },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 flex flex-col gap-4 shadow-2xl">
        <div className="text-4xl text-center">{slide.icon}</div>
        <h2 className="text-lg font-semibold text-center text-gray-900">{slide.title}</h2>

        {slide.text && <p className="text-sm text-gray-600 text-center leading-relaxed">{slide.text}</p>}

        {'items' in slide && slide.items && (
          <div className="flex flex-col gap-2">
            {slide.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full min-w-[32px] text-center ${item.color}`}>{item.label}</span>
                <span className="text-sm text-gray-600">{item.desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-blue-500' : 'bg-gray-200'}`} />
          ))}
        </div>

        <div className="flex gap-2">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition-colors">
              Назад
            </button>
          )}
          <button
            onClick={() => {
              if (step < SLIDES.length - 1) setStep(s => s + 1);
              else { localStorage.setItem('onboarding_done', '1'); onDone(); }
            }}
            className="flex-1 bg-blue-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            {step < SLIDES.length - 1 ? 'Далее' : 'Начать'}
          </button>
        </div>
      </div>
    </div>
  );
}
