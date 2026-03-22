'use client';
import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';

type Meal = { id: string; name: string; time: string; food: string };
type WeekData = Record<string, Meal[]>;

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];

export default function PediatricianMenu() {
  const [menus, setMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [weekData, setWeekData] = useState<WeekData>({
    'Понедельник': [],
    'Вторник': [],
    'Среда': [],
    'Четверг': [],
    'Пятница': [],
  });

  const loadMenus = () => {
    api.get('/activities/menu').then(res => {
      setMenus(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { loadMenus(); }, []);

  const addMeal = (day: string) => {
    setWeekData(prev => ({
      ...prev,
      [day]: [...prev[day], { id: Math.random().toString(), name: '', time: '', food: '' }]
    }));
  };

  const updateMeal = (day: string, id: string, field: keyof Meal, value: string) => {
    setWeekData(prev => ({
      ...prev,
      [day]: prev[day].map(meal => meal.id === id ? { ...meal, [field]: value } : meal)
    }));
  };

  const removeMeal = (day: string, id: string) => {
    setWeekData(prev => ({
      ...prev,
      [day]: prev[day].filter(meal => meal.id !== id)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let content = '';
    DAYS.forEach(day => {
      const meals = weekData[day];
      if (meals && meals.length > 0) {
        content += `**${day}**\n`;
        meals.forEach(m => {
          content += `• ${m.time} — ${m.name}: ${m.food}\n`;
        });
        content += '\n';
      }
    });

    if (!content.trim()) {
      return alert('Добавьте хотя бы один прием пищи!');
    }

    try {
      await api.post('/activities/menu', { title, content, startDate, endDate });
      setShowForm(false);
      setTitle(''); setStartDate(''); setEndDate('');
      setWeekData({ 'Понедельник': [], 'Вторник': [], 'Среда': [], 'Четверг': [], 'Пятница': [] });
      loadMenus();
    } catch (err: any) {
      alert(err.message || 'Ошибка при сохранении меню');
    }
  };

  const deleteMenu = async (id: string) => {
    if (!confirm('Точно удалить это меню? Оно также пропадет из ленты родителей!')) return;
    await api.delete(`/activities/menu/${id}`);
    loadMenus();
  };

  return (
    <PageLayout title="Меню питания">
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-500 text-sm">Здесь вы можете публиковать меню на неделю.</p>
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
          {showForm ? 'Отменить' : '+ Добавить меню'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 border rounded-xl mb-6 shadow-sm">
          <h3 className="font-semibold mb-4 col-span-2">Новое меню</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Заголовок</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Например: Меню на неделю 1-7 мая" className="w-full border rounded px-3 py-2 text-sm" />
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

          <div className="space-y-6 mb-6">
            <h4 className="font-medium text-sm text-gray-800 border-b pb-2">Рацион по дням</h4>
            
            {DAYS.map(day => (
              <div key={day} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex justify-between items-center mb-3">
                  <h5 className="font-semibold text-gray-800">{day}</h5>
                  <button type="button" onClick={() => addMeal(day)} className="text-xs bg-white border px-2 py-1 rounded text-indigo-600 font-medium hover:bg-indigo-50">
                    + Прием пищи
                  </button>
                </div>
                
                {weekData[day].length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Нет приемов пищи</p>
                ) : (
                  <div className="space-y-2">
                    {weekData[day].map((meal, index) => (
                      <div key={meal.id} className="flex gap-2 items-start">
                        <div className="w-1/4">
                          <input required placeholder="Завтрак" value={meal.name} onChange={e => updateMeal(day, meal.id, 'name', e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs" />
                        </div>
                        <div className="w-1/4">
                          <input required type="time" value={meal.time} onChange={e => updateMeal(day, meal.id, 'time', e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs" />
                        </div>
                        <div className="w-2/4 flex gap-2">
                          <input required placeholder="Омлет, чай, хлеб" value={meal.food} onChange={e => updateMeal(day, meal.id, 'food', e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs" />
                          <button type="button" onClick={() => removeMeal(day, meal.id)} className="text-red-400 hover:text-red-600 px-1" title="Удалить">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm w-full hover:bg-green-700">
            Опубликовать в Ленту
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Загрузка...</p>
      ) : menus.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-xl border border-dashed">
          Нет опубликованных меню
        </div>
      ) : (
        <div className="space-y-4">
          {menus.map(m => (
            <div key={m.id} className="bg-white p-5 border rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-medium text-lg text-gray-900">{m.title}</h3>
                  <div className="text-xs text-gray-500 mt-1">
                    С {new Date(m.startDate).toLocaleDateString('ru')} по {new Date(m.endDate).toLocaleDateString('ru')} • Опубликовал: {m.author?.name}
                  </div>
                </div>
                <button onClick={() => deleteMenu(m.id)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded" title="Удалить">🗑️</button>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap mt-3 bg-orange-50 p-4 rounded-lg leading-relaxed">
                {m.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
