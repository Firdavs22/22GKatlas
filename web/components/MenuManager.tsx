'use client';

import { useEffect, useMemo, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import {
  MENU_DAY_NAMES,
  MenuMeal,
  formatMenuContent,
  parseMenuContent,
  sortMenuMeals,
} from '@/lib/menu';

const MEAL_NAME_OPTIONS = ['Завтрак', 'Второй завтрак', 'Обед', 'Полдник', 'Ужин'];
const CUSTOM_MEAL_NAME = 'custom';

const emptyMealForm: MenuMeal = {
  dayIndex: 0,
  name: '',
  time: '',
  food: '',
  alternative: '',
};

function makeId() {
  return Math.random().toString(36).slice(2);
}

export default function MenuManager() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [draftMeals, setDraftMeals] = useState<MenuMeal[]>([]);
  const [mealForm, setMealForm] = useState<MenuMeal>(emptyMealForm);

  const loadMenus = () => {
    setLoading(true);
    api.get('/activities/menu')
      .then(res => setMenus(res.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMenus();
  }, []);

  const byDay = useMemo(() => MENU_DAY_NAMES.map((label, index) => ({
    label,
    dayIndex: index,
    items: sortMenuMeals(draftMeals.filter(meal => meal.dayIndex === index)),
  })), [draftMeals]);

  const openMealModal = (dayIndex: number) => {
    setMealForm({ ...emptyMealForm, dayIndex, name: 'Завтрак' });
    setShowMealModal(true);
  };

  const addMeal = (e: React.FormEvent) => {
    e.preventDefault();
    setDraftMeals(prev => [...prev, { ...mealForm, id: makeId() }]);
    setShowMealModal(false);
    setMealForm(emptyMealForm);
  };

  const removeMeal = (id?: string) => {
    setDraftMeals(prev => prev.filter(meal => meal.id !== id));
  };

  const handleSubmit = async () => {
    if (draftMeals.length === 0) return alert('Добавьте хотя бы один приём пищи');
    if (!title || !startDate || !endDate) return alert('Заполните название и даты меню');

    const content = formatMenuContent(draftMeals);
    try {
      await api.post('/activities/menu', { title, content, startDate, endDate });
      setShowForm(false);
      setTitle('');
      setStartDate('');
      setEndDate('');
      setDraftMeals([]);
      loadMenus();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Ошибка при сохранении меню');
    }
  };

  const deleteMenu = async (id: string) => {
    if (!confirm('Точно удалить это меню?')) return;
    await api.delete(`/activities/menu/${id}`);
    loadMenus();
  };

  return (
    <PageLayout title="Меню питания">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
        <p className="text-gray-500 text-sm max-w-2xl">
          Меню собирается по дням недели. Для детей с аллергиями можно указать альтернативное блюдо прямо в карточке приёма пищи.
        </p>
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
          {showForm ? 'Отменить' : '+ Составить меню'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Заголовок меню</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Например: Меню 1-7 мая" className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Дата начала</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Дата окончания</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
            {byDay.map(day => (
              <div key={day.label} className="border rounded-xl bg-gray-50 overflow-hidden flex flex-col min-h-[180px]">
                <div className="bg-orange-100 text-orange-800 font-medium text-center py-2 text-sm">{day.label}</div>
                <div className="p-2 space-y-2 flex-1">
                  {day.items.length === 0 ? <p className="text-xs text-gray-400 text-center mt-2 italic">Пусто</p> : null}
                  {day.items.map(item => (
                    <div key={item.id} className="text-xs p-2 bg-white border border-orange-100 rounded shadow-sm group relative">
                      <div className="font-bold text-orange-600 mb-0.5">{item.time} — {item.name}</div>
                      <div className="text-gray-700">{item.food}</div>
                      {item.alternative && (
                        <div className="mt-1 text-emerald-700 bg-emerald-50 rounded px-2 py-1">
                          Альтернатива: {item.alternative}
                        </div>
                      )}
                      <button onClick={() => removeMeal(item.id)} className="absolute top-1 right-1 text-red-400 opacity-0 group-hover:opacity-100 bg-white rounded-full px-1">×</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => openMealModal(day.dayIndex)} className="m-2 border border-dashed border-orange-200 text-orange-700 rounded-lg py-2 text-xs font-medium hover:bg-orange-50">
                  + Добавить блюдо
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={handleSubmit} className="bg-green-600 text-white px-4 py-3 rounded-xl text-sm font-bold w-full hover:bg-green-700 shadow-md">
            Сохранить и отправить родителям
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Загрузка...</p>
      ) : menus.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-xl border border-dashed">
          Нет опубликованных меню
        </div>
      ) : (
        <div className="space-y-6">
          {menus.map(menu => {
            const parsed = parseMenuContent(menu.content || '');
            const hasParsed = MENU_DAY_NAMES.some(day => parsed[day].length > 0);
            return (
              <div key={menu.id} className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <div className="flex justify-between items-start p-5 pb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{menu.title}</h3>
                    <div className="text-xs text-gray-500 mt-1">
                      С {new Date(menu.startDate).toLocaleDateString('ru')} по {new Date(menu.endDate).toLocaleDateString('ru')} · {menu.author?.name}
                    </div>
                  </div>
                  <button onClick={() => deleteMenu(menu.id)} className="text-red-500 hover:text-red-700 px-2 py-1 bg-red-50 rounded text-sm" title="Удалить">Удалить</button>
                </div>
                {hasParsed ? (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-0 border-t">
                    {MENU_DAY_NAMES.map(day => (
                      <div key={day} className="border-b md:border-b-0 md:border-r last:border-r-0">
                        <div className="bg-orange-50 text-orange-700 font-medium text-center py-2 text-xs border-b">{day}</div>
                        <div className="p-2 space-y-2 min-h-[80px]">
                          {parsed[day].length === 0 ? (
                            <p className="text-xs text-gray-300 text-center mt-2 italic">—</p>
                          ) : parsed[day].map((meal, index) => (
                            <div key={`${meal.time}-${index}`} className="text-xs">
                              <div className="font-semibold text-orange-600">{meal.time} — {meal.name}</div>
                              <div className="text-gray-600">{meal.food}</div>
                              {meal.alternative && <div className="text-emerald-700 mt-1">Альтернатива: {meal.alternative}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-700 whitespace-pre-wrap p-5 pt-2 bg-orange-50 leading-relaxed">
                    {menu.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showMealModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowMealModal(false)}>
          <form onSubmit={addMeal} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Новое блюдо</h3>
                <p className="text-sm text-gray-500">{MENU_DAY_NAMES[mealForm.dayIndex]}</p>
              </div>
              <button type="button" onClick={() => setShowMealModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">День</label>
                  <select value={mealForm.dayIndex} onChange={e => setMealForm(p => ({ ...p, dayIndex: +e.target.value }))} className="w-full border rounded-lg px-3 py-2">
                    {MENU_DAY_NAMES.map((name, index) => <option key={name} value={index}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Время</label>
                  <input type="time" value={mealForm.time} onChange={e => setMealForm(p => ({ ...p, time: e.target.value }))} className="w-full border rounded-lg px-3 py-2" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Приём пищи</label>
                <select
                  value={MEAL_NAME_OPTIONS.includes(mealForm.name) ? mealForm.name : CUSTOM_MEAL_NAME}
                  onChange={e => setMealForm(p => ({ ...p, name: e.target.value === CUSTOM_MEAL_NAME ? '' : e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {MEAL_NAME_OPTIONS.map(name => <option key={name} value={name}>{name}</option>)}
                  <option value={CUSTOM_MEAL_NAME}>Свой вариант</option>
                </select>
                {!MEAL_NAME_OPTIONS.includes(mealForm.name) && (
                  <input
                    placeholder="Например: Перекус"
                    value={mealForm.name}
                    onChange={e => setMealForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 mt-2"
                    required
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Основное блюдо</label>
                <input placeholder="Омлет, чай, хлеб" value={mealForm.food} onChange={e => setMealForm(p => ({ ...p, food: e.target.value }))} className="w-full border rounded-lg px-3 py-2" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Альтернатива для аллергий и особенностей питания</label>
                <textarea placeholder="Например: безлактозная каша, фрукт вместо йогурта" value={mealForm.alternative} onChange={e => setMealForm(p => ({ ...p, alternative: e.target.value }))} className="w-full border rounded-lg px-3 py-2 h-20" />
              </div>
            </div>
            <div className="p-5 border-t flex gap-2">
              <button type="submit" className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600">Добавить</button>
              <button type="button" onClick={() => setShowMealModal(false)} className="px-4 py-2 rounded-lg border text-gray-600 text-sm hover:bg-gray-50">Отмена</button>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
}
