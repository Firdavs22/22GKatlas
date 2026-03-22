'use client';
import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';

export default function AdminEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');

  const loadEvents = () => {
    api.get('/activities/events').then(res => {
      setEvents(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { loadEvents(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/activities/events', { title, description, eventDate });
      setShowForm(false);
      setTitle(''); setDescription(''); setEventDate('');
      loadEvents();
    } catch (err: any) {
      alert(err.message || 'Ошибка при сохранении события');
    }
  };

  const deleteEvt = async (id: string) => {
    if (!confirm('Точно удалить событие?')) return;
    await api.delete(`/activities/events/${id}`);
    loadEvents();
  };

  return (
    <PageLayout title="Календарь событий">
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-500 text-sm">Создавайте праздники, утренники и объявления.</p>
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
          {showForm ? 'Отменить' : '+ Добавить событие'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 border rounded-xl mb-6 shadow-sm">
          <h3 className="font-semibold mb-4">Новое событие</h3>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Название события</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Например: Праздник Осени" className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Дата события</label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} required className="w-full md:w-1/2 border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Описание (опционально)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Подробности для родителей..." className="w-full border rounded px-3 py-2 text-sm h-24" />
            </div>
          </div>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm w-full hover:bg-green-700">
            Добавить в Календарь и Ленту
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Загрузка...</p>
      ) : events.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-xl border border-dashed">
          Пока нет запланированных событий
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map(evt => (
            <div key={evt.id} className="bg-white p-5 border border-l-4 border-l-blue-500 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-medium">
                  {new Date(evt.eventDate).toLocaleDateString('ru')}
                </div>
                <button onClick={() => deleteEvt(evt.id)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 rounded" title="Удалить">🗑️</button>
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mt-2">{evt.title}</h3>
              {evt.description && (
                <div className="text-sm text-gray-600 whitespace-pre-wrap mt-2">
                  {evt.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
