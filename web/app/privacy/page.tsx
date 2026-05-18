'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

interface PrivacyContent {
  title: string;
  body: string;
  updatedLabel: string;
}

const DEFAULT_CONTENT: PrivacyContent = {
  title: 'Политика конфиденциальности',
  body: `Эта страница описывает, как ГлобоАтлас обрабатывает персональные данные детей и их законных представителей в соответствии с Федеральным законом № 152-ФЗ «О персональных данных».

1. Кто обрабатывает данные
Оператор персональных данных — администрация детского сада, использующего систему ГлобоАтлас. Полное наименование и контакты указаны в договоре с детским садом.

2. Какие данные собираются
— ФИО, возраст, фотографии ребёнка
— ФИО, email, телефон родителя / законного представителя
— Данные о посещаемости, прогрессе развития, наблюдениях педагога
— Медицинские пометки (аллергии, особенности питания) — только то, что родитель указал явно
— Логи взаимодействия с системой (необходимы для безопасности)

3. Цели обработки
Данные используются исключительно для:
— Ведения образовательного процесса
— Информирования родителей о развитии ребёнка
— Организационных вопросов (расписание, мероприятия, оплата)

4. Кто имеет доступ
— Администрация сада: полный доступ
— Педагог: только дети своей группы
— Специалисты (психолог, педиатр): только закреплённые за ними дети
— Родители: только своих детей
— Третьи лица — НЕ ПЕРЕДАЁМ, кроме случаев, прямо предусмотренных законом

5. Срок хранения
Данные ребёнка хранятся в течение всего периода обучения и 3 года после выпуска (для возможности восстановления). Затем — обезличиваются или удаляются.

6. Права пользователя
Любой родитель в любой момент может:
— Получить копию всех данных о своём ребёнке (раздел «Настройки» → «Экспорт»)
— Внести изменения в свои данные
— Удалить свой аккаунт (соответствующая кнопка в настройках). После удаления данные обезличиваются в течение 30 дней.

7. Передача в третьи страны
Все серверы расположены в Российской Федерации. Передача за пределы РФ не осуществляется.

8. Контакты для запросов
По вопросам обработки данных пишите администрации сада. Запросы рассматриваются в течение 30 дней.

9. Согласие
Активация аккаунта в системе означает согласие с настоящей политикой. Отозвать согласие можно через удаление аккаунта или письменное обращение к оператору.`,
  updatedLabel: 'Редакция от 17 мая 2026',
};

export default function PrivacyPage() {
  const [content, setContent] = useState<PrivacyContent>(DEFAULT_CONTENT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/site-content/privacy')
      .then(r => {
        const data = r.data;
        if (data && (data.title || data.body)) {
          setContent({
            title: data.title || DEFAULT_CONTENT.title,
            body: data.body || DEFAULT_CONTENT.body,
            updatedLabel: data.updatedLabel || DEFAULT_CONTENT.updatedLabel,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/login" className="text-xs text-slate-500 hover:text-foreground transition-colors">
          ← Назад ко входу
        </Link>
        <div className="text-[11px] uppercase tracking-wider text-slate-500 mt-6">
          {content.updatedLabel}
        </div>
        <h1 className="font-serif text-4xl mt-1 mb-6">{content.title}</h1>
        <div className="prose prose-slate max-w-none">
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {content.body}
          </p>
        </div>
      </div>
    </div>
  );
}
