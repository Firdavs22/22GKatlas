'use client';
import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { MENU_DAY_NAMES, MENU_DAY_SHORT, parseMenuContent } from '@/lib/menu';

const DAY_NAMES = MENU_DAY_NAMES;
const DAY_SHORT = MENU_DAY_SHORT;

const MEAL_ICONS: Record<string, string> = {
  'Завтрак': '🥞',
  'Обед': '🍲',
  'Полдник': '🍎',
  'Ужин': '🍽️',
  'Перекус': '🥛',
};

export default function ParentMenu() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const todayIndex = (new Date().getDay() + 6) % 7; // Convert Sun=0 to Mon=0
  const [activeDay, setActiveDay] = useState(todayIndex < 5 ? todayIndex : 0);

  useEffect(() => {
    api.get('/activities/menu').then(res => {
      setMenus(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Get the most recent (current) menu
  const currentMenu = menus[0];

  if (loading) return <PageLayout title="Меню питания"><div className="text-center py-10 text-gray-400">Загрузка...</div></PageLayout>;

  if (!currentMenu) {
    return (
      <PageLayout title="Меню питания">
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🍽️</div>
          <div className="text-gray-500 text-lg font-medium">Меню ещё не опубликовано</div>
          <div className="text-gray-400 text-sm mt-1">Администратор скоро добавит меню на неделю</div>
        </div>
      </PageLayout>
    );
  }

  const parsed = parseMenuContent(currentMenu.content || '');
  const hasParsed = DAY_NAMES.some(d => parsed[d].length > 0);

  return (
    <PageLayout title="Меню питания">
      {/* Header card */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl p-5 mb-6 shadow-lg">
        <div className="text-orange-100 text-sm">Текущее меню</div>
        <div className="text-xl font-bold mt-1">{currentMenu.title}</div>
        <div className="text-orange-200 text-xs mt-1">
          С {new Date(currentMenu.startDate).toLocaleDateString('ru')} по {new Date(currentMenu.endDate).toLocaleDateString('ru')}
        </div>
      </div>

      {hasParsed ? (
        <>
          {/* Day tabs */}
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
            {DAY_NAMES.map((day, i) => (
              <button
                key={day}
                onClick={() => setActiveDay(i)}
                className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  activeDay === i
                    ? 'bg-white shadow-sm text-orange-600 font-bold'
                    : i === todayIndex
                    ? 'text-orange-500 hover:bg-white/50'
                    : 'text-gray-500 hover:bg-white/50'
                }`}
              >
                <div>{DAY_SHORT[i]}</div>
                {i === todayIndex && <div className="text-[9px] mt-0.5">Сегодня</div>}
              </button>
            ))}
          </div>

          {/* Meal card for selected day */}
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="bg-orange-50 px-4 py-3 border-b">
              <h3 className="font-medium text-sm text-orange-700">{DAY_NAMES[activeDay]}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {parsed[DAY_NAMES[activeDay]].length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">Нет данных на этот день</div>
              ) : parsed[DAY_NAMES[activeDay]].map((meal, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-lg shrink-0 mt-0.5">
                    {MEAL_ICONS[meal.name] || '🍴'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-orange-600">{meal.time}</span>
                      <span className="text-sm font-medium text-gray-800">{meal.name}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">{meal.food}</div>
                    {meal.alternative && (
                      <div className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1 mt-2">
                        Альтернатива: {meal.alternative}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full week overview (collapsed) */}
          <details className="mt-4">
            <summary className="text-sm text-indigo-600 font-medium cursor-pointer hover:underline">Показать всю неделю</summary>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-3">
              {DAY_NAMES.map(day => (
                <div key={day} className="border rounded-xl overflow-hidden">
                  <div className="bg-orange-50 text-orange-700 font-medium text-center py-1.5 text-xs border-b">{day}</div>
                  <div className="p-2 space-y-1.5 min-h-[60px]">
                    {parsed[day].length === 0 ? (
                      <p className="text-xs text-gray-300 text-center mt-2">—</p>
                    ) : parsed[day].map((meal, i) => (
                      <div key={i} className="text-xs">
                        <div className="font-semibold text-orange-600">{meal.time} — {meal.name}</div>
                        <div className="text-gray-600">{meal.food}</div>
                        {meal.alternative && <div className="text-emerald-700 mt-0.5">Альтернатива: {meal.alternative}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </>
      ) : (
        /* Raw text fallback */
        <div className="bg-white border rounded-xl p-5">
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{currentMenu.content}</div>
        </div>
      )}

      {/* Older menus */}
      {menus.length > 1 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Предыдущие меню</h3>
          <div className="space-y-2">
            {menus.slice(1).map(m => (
              <details key={m.id} className="bg-white border rounded-xl overflow-hidden">
                <summary className="px-4 py-3 cursor-pointer hover:bg-gray-50 text-sm font-medium text-gray-700">
                  {m.title} ({new Date(m.startDate).toLocaleDateString('ru')} — {new Date(m.endDate).toLocaleDateString('ru')})
                </summary>
                <div className="px-4 pb-3">
                  {(() => {
                    const p = parseMenuContent(m.content || '');
                    const has = DAY_NAMES.some(d => p[d].length > 0);
                    if (!has) return <div className="text-sm text-gray-600 whitespace-pre-wrap">{m.content}</div>;
                    return (
                      <div className="grid grid-cols-5 gap-2 mt-2">
                        {DAY_NAMES.map(day => (
                          <div key={day} className="border rounded-lg overflow-hidden">
                            <div className="bg-orange-50 text-orange-700 font-medium text-center py-1 text-[10px]">{day}</div>
                            <div className="p-1.5 space-y-1">
                              {p[day].length === 0 ? <p className="text-[10px] text-gray-300 text-center">—</p> :
                                p[day].map((meal, i) => (
                                  <div key={i} className="text-[10px]">
                                    <span className="font-bold text-orange-600">{meal.time}</span> {meal.name}: <span className="text-gray-600">{meal.food}</span>
                                    {meal.alternative && <div className="text-emerald-700 mt-0.5">Альтернатива: {meal.alternative}</div>}
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
