'use client';
import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';

export default function AdminBroadcasts() {
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetGroups, setTargetGroups] = useState<string[]>(['all']); // 'all' means everyone

  const loadData = async () => {
    try {
      const [b, g] = await Promise.all([
        api.get('/activities/broadcasts'),
        api.get('/admin/groups')
      ]);
      setBroadcasts(b.data);
      setGroups(g.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleGroupToggle = (groupId: string) => {
    setTargetGroups(prev => {
      // If turning ON a specific group, we must remove 'all' if present.
      let newTargets = [...prev];
      if (groupId === 'all') {
        return ['all']; // selecting 'all' clears specific groups
      }
      
      // Removing 'all' since a specific group is clicked
      newTargets = newTargets.filter(t => t !== 'all');
      
      if (newTargets.includes(groupId)) {
        newTargets = newTargets.filter(t => t !== groupId);
      } else {
        newTargets.push(groupId);
      }
      return newTargets.length === 0 ? ['all'] : newTargets;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetGroups.length === 0) return alert('Выберите кому отправить');
    
    try {
      const res = await api.post('/activities/broadcasts', { title, message, targetGroups });
      alert(`Успешно отправлено: ${res.data.recipientsCount} получателей`);
      setShowForm(false);
      setTitle(''); setMessage(''); setTargetGroups(['all']);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Ошибка при отправке рассылки');
    }
  };

  return (
    <PageLayout title="Рассылка уведомлений">
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-500 text-sm">Отправляйте пуш-уведомления родителям выбранных групп.</p>
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
          {showForm ? 'Отменить' : '✉️ Новая рассылка'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 border rounded-xl mb-6 shadow-sm">
          <h3 className="font-semibold mb-4">Создание рассылки</h3>
          <div className="space-y-4 mb-4">
            
            {/* Группы получателей */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Кому отправить:</label>
              <div className="flex flex-wrap gap-2">
                <button 
                  type="button" 
                  onClick={() => setTargetGroups(['all'])}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${targetGroups.includes('all') ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                >
                  Всем родителям
                </button>
                {groups.map(g => (
                  <button 
                    key={g.id}
                    type="button" 
                    onClick={() => handleGroupToggle(g.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border ${targetGroups.includes(g.id) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                  >
                    Группа: {g.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Заголовок рассылки</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Важное объявление" className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Текст рассылки</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} required placeholder="Пишите текст здесь..." className="w-full border rounded px-3 py-2 text-sm h-32" />
            </div>
          </div>
          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm w-full hover:bg-indigo-700">
            Отправить рассылку
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Загрузка...</p>
      ) : broadcasts.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-xl border border-dashed">
          История рассылок пуста
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 mb-2">История рассылок</h3>
          {broadcasts.map(b => (
            <div key={b.id} className="bg-white p-4 border rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">{b.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Отправлено: {new Date(b.sentAt).toLocaleString('ru')} • 
                    Получатели: {b.targetGroups.includes('all') ? 'Все' : b.targetGroups.length + ' групп(ы)'}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap mt-2 bg-gray-50 p-3 rounded">
                {b.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
