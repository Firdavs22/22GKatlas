'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X, Pencil } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';
import {
  MENU_DAY_NAMES,
  MENU_DAY_SHORT,
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

interface MenuRow {
  id: string;
  title: string;
  content: string;
  startDate: string;
  endDate: string;
  author?: { name: string };
}

const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

const makeId = () => Math.random().toString(36).slice(2);

export default function MenuManager() {
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mealModalOpen, setMealModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [draftMeals, setDraftMeals] = useState<MenuMeal[]>([]);
  const [mealForm, setMealForm] = useState<MenuMeal>(emptyMealForm);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setStartDate('');
    setEndDate('');
    setDraftMeals([]);
  };

  const openEdit = (menu: MenuRow) => {
    const parsed = parseMenuContent(menu.content || '');
    const meals: MenuMeal[] = [];
    MENU_DAY_NAMES.forEach((dayName, dayIndex) => {
      parsed[dayName].forEach(m => {
        meals.push({
          id: makeId(),
          dayIndex,
          name: m.name,
          time: m.time,
          food: m.food,
          alternative: m.alternative || '',
        });
      });
    });
    setEditingId(menu.id);
    setTitle(menu.title);
    setStartDate(menu.startDate.slice(0, 10));
    setEndDate(menu.endDate.slice(0, 10));
    setDraftMeals(meals);
    setFormOpen(true);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const load = () => {
    setLoading(true);
    api
      .get('/activities/menu')
      .then(r => setMenus(r.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const byDay = useMemo(
    () =>
      MENU_DAY_NAMES.map((label, index) => ({
        label,
        dayIndex: index,
        items: sortMenuMeals(draftMeals.filter(meal => meal.dayIndex === index)),
      })),
    [draftMeals],
  );

  const openMealModal = (dayIndex: number) => {
    setMealForm({ ...emptyMealForm, dayIndex, name: 'Завтрак' });
    setMealModalOpen(true);
  };

  const addMeal = (e: React.FormEvent) => {
    e.preventDefault();
    setDraftMeals(prev => [...prev, { ...mealForm, id: makeId() }]);
    setMealModalOpen(false);
    setMealForm(emptyMealForm);
  };

  const removeMeal = (id?: string) => {
    setDraftMeals(prev => prev.filter(meal => meal.id !== id));
  };

  const submit = async () => {
    if (draftMeals.length === 0) return alert('Добавьте хотя бы один приём пищи');
    if (!title || !startDate || !endDate) return alert('Заполните название и даты меню');
    const content = formatMenuContent(draftMeals);
    try {
      if (editingId) {
        await api.put(`/activities/menu/${editingId}`, { title, content, startDate, endDate });
      } else {
        await api.post('/activities/menu', { title, content, startDate, endDate });
      }
      setFormOpen(false);
      resetForm();
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Ошибка при сохранении меню');
    }
  };

  const del = async (id: string) => {
    if (!confirm('Удалить это меню?')) return;
    await api.delete(`/activities/menu/${id}`);
    load();
  };

  return (
    <PageLayout
      eyebrow="Питание на неделю"
      title="Меню"
      wide
      actions={
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            if (formOpen) {
              setFormOpen(false);
              resetForm();
            } else {
              resetForm();
              setFormOpen(true);
            }
          }}
        >
          <Plus size={16} />
          {formOpen ? 'Закрыть' : 'Составить меню'}
        </Button>
      }
    >
      <p className="text-sm text-slate-500 mb-6 max-w-2xl">
        Меню собирается по дням недели. Для детей с аллергиями указывайте альтернативу прямо в карточке блюда.
      </p>

      {formOpen && (
        <Card padding="md" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-100">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Заголовок
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Меню 1–7 мая"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Начало
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Окончание
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
            {byDay.map(day => (
              <div key={day.label} className="rounded-2xl border border-slate-100 overflow-hidden flex flex-col min-h-[180px] bg-slate-50/30">
                <div className="px-3 py-2 border-b border-slate-100 bg-brand-pale/30 text-center">
                  <span className="font-serif text-base text-brand">{day.label}</span>
                </div>
                <div className="p-2 space-y-2 flex-1">
                  {day.items.length === 0 ? (
                    <p className="text-xs text-slate-300 text-center mt-2 italic">Пусто</p>
                  ) : (
                    day.items.map(item => (
                      <div
                        key={item.id}
                        className="group relative text-xs p-2.5 rounded-xl bg-white border border-slate-100"
                      >
                        <div className="tabular-nums text-[11px] text-brand">
                          {item.time} · {item.name}
                        </div>
                        <div className="text-sm text-foreground mt-0.5">{item.food}</div>
                        {item.alternative && (
                          <div className="mt-1.5 text-[11px] text-emerald-700 bg-success/20 rounded-md px-2 py-1">
                            Альт.: {item.alternative}
                          </div>
                        )}
                        <button
                          onClick={() => removeMeal(item.id)}
                          className="absolute top-1.5 right-1.5 p-1 text-slate-300 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openMealModal(day.dayIndex)}
                  className="m-2 mt-0 border border-dashed border-slate-300 text-slate-500 rounded-xl py-2 text-xs font-medium hover:border-brand hover:text-brand transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Plus size={12} /> Блюдо
                </button>
              </div>
            ))}
          </div>

          <Button type="button" variant="primary" onClick={submit} className="w-full">
            {editingId ? 'Сохранить изменения' : 'Сохранить и отправить родителям'}
          </Button>
        </Card>
      )}

      {loading ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-8 text-center">Загрузка…</div>
        </Card>
      ) : menus.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            Нет опубликованных меню
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {menus.map(menu => {
            const parsed = parseMenuContent(menu.content || '');
            const hasParsed = MENU_DAY_NAMES.some(d => parsed[d].length > 0);
            return (
              <Card key={menu.id} padding="none" className="overflow-hidden">
                <div className="px-6 py-4 flex items-start justify-between gap-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-serif text-2xl">{menu.title}</h3>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(menu.startDate).toLocaleDateString('ru-RU')} —{' '}
                      {new Date(menu.endDate).toLocaleDateString('ru-RU')}
                      {menu.author?.name ? ` · ${menu.author.name}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(menu)}
                      className="p-1.5 text-slate-400 hover:text-brand transition-colors"
                      title="Редактировать меню"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => del(menu.id)}
                      className="p-1.5 text-slate-400 hover:text-danger transition-colors"
                      title="Удалить"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                {hasParsed ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/40">
                          {MENU_DAY_NAMES.map((d, i) => (
                            <th
                              key={d}
                              className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-4 py-3"
                            >
                              {MENU_DAY_SHORT[i]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {MENU_DAY_NAMES.map(d => (
                            <td key={d} className="px-4 py-3 align-top">
                              <div className="space-y-2">
                                {parsed[d].length === 0 ? (
                                  <span className="text-slate-300 italic text-xs">—</span>
                                ) : (
                                  parsed[d].map((meal, idx) => (
                                    <div key={`${meal.time}-${idx}`} className="text-xs">
                                      <div className="tabular-nums text-[11px] text-brand">
                                        {meal.time} · {meal.name}
                                      </div>
                                      <div className="text-foreground mt-0.5">{meal.food}</div>
                                      {meal.alternative && (
                                        <div className="text-[11px] text-emerald-700 mt-1">
                                          Альт.: {meal.alternative}
                                        </div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-sm text-slate-700 whitespace-pre-wrap p-6 leading-relaxed">
                    {menu.content}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {mealModalOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setMealModalOpen(false)}
        >
          <form
            onSubmit={addMeal}
            className="bg-background rounded-3xl shadow-xl w-full max-w-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div>
                <SectionLabel>Новое блюдо</SectionLabel>
                <h3 className="font-serif text-2xl mt-1">{MENU_DAY_NAMES[mealForm.dayIndex]}</h3>
              </div>
              <button
                type="button"
                onClick={() => setMealModalOpen(false)}
                className="text-slate-400 hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                    День
                  </label>
                  <select
                    value={mealForm.dayIndex}
                    onChange={e => setMealForm(p => ({ ...p, dayIndex: +e.target.value }))}
                    className={inputCls}
                  >
                    {MENU_DAY_NAMES.map((n, i) => (
                      <option key={n} value={i}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                    Время
                  </label>
                  <input
                    type="time"
                    value={mealForm.time}
                    onChange={e => setMealForm(p => ({ ...p, time: e.target.value }))}
                    required
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Приём пищи
                </label>
                <select
                  value={
                    MEAL_NAME_OPTIONS.includes(mealForm.name) ? mealForm.name : CUSTOM_MEAL_NAME
                  }
                  onChange={e =>
                    setMealForm(p => ({
                      ...p,
                      name: e.target.value === CUSTOM_MEAL_NAME ? '' : e.target.value,
                    }))
                  }
                  className={inputCls}
                >
                  {MEAL_NAME_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                  <option value={CUSTOM_MEAL_NAME}>Свой вариант</option>
                </select>
                {!MEAL_NAME_OPTIONS.includes(mealForm.name) && (
                  <input
                    placeholder="Например: Перекус"
                    value={mealForm.name}
                    onChange={e => setMealForm(p => ({ ...p, name: e.target.value }))}
                    className={`${inputCls} mt-2`}
                    required
                  />
                )}
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Основное блюдо
                </label>
                <input
                  placeholder="Омлет, чай, хлеб"
                  value={mealForm.food}
                  onChange={e => setMealForm(p => ({ ...p, food: e.target.value }))}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Альтернатива (для аллергий)
                </label>
                <textarea
                  placeholder="Безлактозная каша, фрукт вместо йогурта"
                  value={mealForm.alternative}
                  onChange={e => setMealForm(p => ({ ...p, alternative: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                />
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex gap-2">
              <Button type="submit" variant="primary">Добавить</Button>
              <Button type="button" variant="outline" onClick={() => setMealModalOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
}
