'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface Slide {
  title: string;
  body: string;
  emoji: string;
}

const SLIDES: Record<string, Slide[]> = {
  parent: [
    {
      emoji: '📰',
      title: 'Лента группы',
      body: 'Здесь появляются фотографии и новости от педагогов. Лайкайте посты с вашим ребёнком — педагогу важна обратная связь.',
    },
    {
      emoji: '🗺',
      title: 'Карта развития',
      body: 'Светофоры показывают прогресс по трём измерениям: Эмоции, Мышление, Тело. Тапните карточку — увидите все навыки и стадию каждого.',
    },
    {
      emoji: '💬',
      title: 'Чаты',
      body: 'Прямая связь с педагогом и специалистами. Сообщения видят только участники беседы — данные ребёнка защищены.',
    },
    {
      emoji: '⚙️',
      title: 'Настройки',
      body: 'В настройках можно сменить пароль, скачать экспорт всех данных (152-ФЗ) и удалить аккаунт. Согласие на обработку ПДн вы дали при активации.',
    },
  ],
  teacher: [
    {
      emoji: '🎓',
      title: 'Прогресс детей',
      body: 'Главный экран — матрица детей вашей группы и их освоенных навыков. Кликните клетку, чтобы изменить стадию.',
    },
    {
      emoji: '📝',
      title: 'Дневник наблюдений',
      body: 'Записывайте короткие наблюдения по детям с фотографиями. AI поможет сформулировать развёрнутую запись из ваших ключевых слов.',
    },
    {
      emoji: '📰',
      title: 'Лента',
      body: 'Публикации для родителей — фото с занятий, достижения, объявления для группы. Модалка «Новая публикация» в шапке.',
    },
    {
      emoji: '📋',
      title: 'Рекомендации',
      body: 'Выдавайте задания для дома — родителю придёт уведомление. Привязывайте задание к конкретному навыку для точечного развития.',
    },
  ],
  psychologist: [
    { emoji: '👶', title: 'Дети', body: 'Список закреплённых за вами детей. По каждому — наблюдения, заметки, портфолио.' },
    { emoji: '📋', title: 'Рекомендации', body: 'Выдавайте задания родителям. Их можно отслеживать в режиме «выполнено / в процессе».' },
    { emoji: '📅', title: 'Слоты приёма', body: 'Расписывайте окна для родительских встреч. Родитель бронирует через приложение.' },
  ],
  pediatrician: [
    { emoji: '👶', title: 'Дети', body: 'Список закреплённых детей с медицинскими пометками (аллергии, особенности).' },
    { emoji: '🩺', title: 'Назначения', body: 'Записывайте рекомендации, привязанные к ребёнку. Видимость настраивается — только себе, с педагогом или родителю.' },
    { emoji: '📅', title: 'Слоты приёма', body: 'Окна для приёма — родитель сможет записаться через мобильное приложение.' },
  ],
};

export default function OnboardingModal({ role }: { role: string }) {
  const { user, refreshUser } = useAuth();
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);

  const slides = SLIDES[role] || [];

  useEffect(() => {
    if (!user) return;
    if (slides.length === 0) return;
    // Admins skip — they figure it out
    if (role === 'admin' || role === 'superadmin') return;
    // Show only if onboarding never completed
    if (!('onboardingCompletedAt' in user) || (user as { onboardingCompletedAt?: string | null }).onboardingCompletedAt) return;
    setOpen(true);
    setIdx(0);
  }, [user, role, slides.length]);

  const finish = async () => {
    setOpen(false);
    try {
      await api.post('/me/onboarding/complete');
      await refreshUser?.();
    } catch { /* */ }
  };

  if (!open || slides.length === 0) return null;

  const slide = slides[idx];
  const isLast = idx === slides.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 text-center relative">
          <button
            type="button"
            onClick={finish}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            aria-label="Пропустить"
          >
            <X size={18} />
          </button>
          <div className="text-5xl mb-3">{slide.emoji}</div>
          <h2 className="font-serif text-2xl mb-3">{slide.title}</h2>
          <p className="text-sm text-slate-700 leading-relaxed text-left">{slide.body}</p>
        </div>

        <div className="px-6 py-4 flex items-center justify-center gap-1.5">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-brand' : 'w-1.5 bg-slate-200'}`}
            />
          ))}
        </div>

        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="text-xs text-slate-500 hover:text-foreground"
          >
            Пропустить
          </button>
          <button
            type="button"
            onClick={() => (isLast ? finish() : setIdx(i => i + 1))}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand/90"
          >
            {isLast ? (
              <>
                <Check size={14} />
                Готово
              </>
            ) : (
              <>
                Дальше
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
