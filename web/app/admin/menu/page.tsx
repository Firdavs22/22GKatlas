'use client';
import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';

type Meal = { id: string; dayIndex: number; name: string; time: string; food: string };
const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];

// Parse saved menu content text back into visual grid
function parseMenuContent(content: string): Record<string, { time: string; name: string; food: string }[]> {
  const result: Record<string, { time: string; name: string; food: string }[]> = {};
  DAY_NAMES.forEach(d => { result[d] = []; });

  let currentDay = '';
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    // Check for day header: **Понедельник**
    const dayMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (dayMatch) {
      const dayName = dayMatch[1].trim();
      if (DAY_NAMES.includes(dayName)) currentDay = dayName;
      continue;
    }
    // Check for meal line: • 08:00 — Завтрак: Омлет
    const mealMatch = trimmed.match(/^[•\-]\s*(\d{1,2}:\d{2})\s*[—–-]\s*(.+?):\s*(.+)$/);
    if (mealMatch && currentDay) {
      result[currentDay].push({ time: mealMatch[1], name: mealMatch[2].trim(), food: mealMatch[3].trim() });
    }
  }
  return result;
}

export default function AdminMenu() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [draftMeals, setDraftMeals] = useState<Meal[]>([]);
  const [mealForm, setMealForm] = useState({ dayIndex: 0, name: '', time: '', food: '' });

  const loadMenus = () => {
    api.get('/activities/menu').then(res => {
      setMenus(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { loadMenus(); }, []);

  const addMeal = (e: React.FormEvent) => {
    e.preventDefault();
    setDraftMeals(prev => [...prev, { id: Math.random().toString(), ...mealForm }]);
    setMealForm(prev => ({ ...prev, name: '', food: '' }));
  };

  const removeMeal = (id: string) => {
    setDraftMeals(prev => prev.filter(m => m.id !== id));
  };

  const handleSubmit = async () => {
    if (draftMeals.length === 0) return alert('Добавьте хотя бы один прием пищи!');
    if (!title || !startDate || !endDate) return alert('Заполните название и даты меню');

    let content = '';
    DAY_NAMES.forEach((day, index) => {
      const dayMeals = draftMeals.filter(m => m.dayIndex === index).sort((a, b) => a.time.localeCompare(b.time));
      if (dayMeals.length > 0) {
        content += `**${day}**\n`;
        dayMeals.forEach(m => { content += `• ${m.time} — ${m.name}: ${m.food}\n`; });
        content += '\n';
      }
    });

    try {
      await api.post('/activities/menu', { title, content, startDate, endDate });
      setShowForm(false);
      setTitle(''); setStartDate(''); setEndDate('');
      setDraftMeals([]);
      loadMenus();
    } catch (err: any) {
      alert(err.message || 'Ошибка при сохранении меню');
    }
  };

  const deleteMenu = async (id: string) => {
    if (!confirm('Точно удалить это меню?')) return;
    await api.delete(`/activities/menu/${id}`);
    loadMenus();
  };

  const byDay = DAY_NAMES.map((label, index) => ({
    label,
    items: draftMeals.filter(m => m.dayIndex === index).sort((a, b) => a.time.localeCompare(b.time))
  }));

  return (
    <PageLayout title="Меню питания">
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-500 text-sm">Здесь вы можете публиковать меню на неделю.</p>
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

          <form onSubmit={addMeal} className="flex flex-wrap items-end gap-3 mb-6 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">День недели</label>
              <select value={mealForm.dayIndex} onChange={e => setMealForm(p => ({ ...p, dayIndex: +e.target.value }))} className="border rounded px-3 py-2 text-sm bg-white">
                {DAY_NAMES.map((name, i) => <option key={i} value={i}>{name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Время</label>
              <input type="time" value={mealForm.time} onChange={e => setMealForm(p => ({ ...p, time: e.target.value }))} className="border rounded px-3 py-2 text-sm w-24" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Прием пищи</label>
              <input placeholder="Завтрак" value={mealForm.name} onChange={e => setMealForm(p => ({ ...p, name: e.target.value }))} className="border rounded px-3 py-2 text-sm w-40" required />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Блюдо</label>
              <input placeholder="Омлет, чай, хлеб" value={mealForm.food} onChange={e => setMealForm(p => ({ ...p, food: e.target.value }))} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
            <button type="submit" className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 whitespace-nowrap">+ В меню</button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
            {byDay.map(d => (
              <div key={d.label} className="border rounded-xl bg-gray-50 overflow-hidden">
                <div className="bg-orange-100 text-orange-800 font-medium text-center py-2 text-sm">{d.label}</div>
                <div className="p-2 space-y-2 min-h-[100px]">
                  {d.items.length === 0 ? <p className="text-xs text-gray-400 text-center mt-2 italic">Пусто</p> : null}
                  {d.items.map(item => (
                    <div key={item.id} className="text-xs p-2 bg-white border border-orange-100 rounded shadow-sm group relative">
                      <div className="font-bold text-orange-600 mb-0.5">{item.time} — {item.name}</div>
                      <div className="text-gray-700">{item.food}</div>
                      <button onClick={() => removeMeal(item.id)} className="absolute top-1 right-1 text-red-400 opacity-0 group-hover:opacity-100 bg-white rounded-full px-1">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={handleSubmit} className="bg-green-600 text-white px-4 py-3 rounded-xl text-sm font-bold w-full hover:bg-green-700 shadow-md">
            Сохранить и отправить родителям 🍎
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
          {menus.map(m => {
            const parsed = parseMenuContent(m.content || '');
            const hasParsed = DAY_NAMES.some(d => parsed[d].length > 0);
            return (
              <div key={m.id} className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <div className="flex justify-between items-start p-5 pb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{m.title}</h3>
                    <div className="text-xs text-gray-500 mt-1">
                      С {new Date(m.startDate).toLocaleDateString('ru')} по {new Date(m.endDate).toLocaleDateString('ru')} • {m.author?.name}
                    </div>
                  </div>
                  <button onClick={() => deleteMenu(m.id)} className="text-red-400 hover:text-red-600 p-1.5 bg-red-50 rounded" title="Удалить">🗑️</button>
                </div>
                {hasParsed ? (
                  <div className="grid grid-cols-5 gap-0 border-t">
                    {DAY_NAMES.map(day => (
                      <div key={day} className="border-r last:border-r-0">
                        <div className="bg-orange-50 text-orange-700 font-medium text-center py-2 text-xs border-b">{day}</div>
                        <div className="p-2 space-y-2 min-h-[80px]">
                          {parsed[day].length === 0 ? (
                            <p className="text-xs text-gray-300 text-center mt-2 italic">—</p>
                          ) : parsed[day].map((meal, i) => (
                            <div key={i} className="text-xs">
                              <div className="font-semibold text-orange-600">{meal.time} — {meal.name}</div>
                              <div className="text-gray-600">{meal.food}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-700 whitespace-pre-wrap p-5 pt-2 bg-orange-50 leading-relaxed">
                    {m.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
