'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Child } from '@/lib/types';
import FileUpload from '@/components/FileUpload';
import AuthMedia from '@/components/AuthMedia';

interface PortfolioItem {
  id: string;
  childId: string;
  type: string;
  title: string;
  description: string | null;
  fileUrl: string;
  date: string;
}

export default function TeacherPortfolio() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  
  const [items, setItems] = useState<PortfolioItem[]>([]);
  
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'photo', fileUrl: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data[0]) setSelectedChild(r.data[0].id);
    });
  }, []);

  const reloadPortfolio = () => {
    if (!selectedChild) return;
    api.get(`/children/${selectedChild}/portfolio`).then(r => setItems(r.data));
  };

  useEffect(() => { reloadPortfolio(); }, [selectedChild]);

  const createItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChild || !form.title) return;
    
    setSaving(true);
    try {
      await api.post(`/children/${selectedChild}/portfolio`, form);
      setShowForm(false);
      setForm({ title: '', description: '', type: 'photo', fileUrl: '' });
      reloadPortfolio();
    } catch {
      alert('Ошибка при сохранении в портфолио');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout title="Портфолио учеников">
      <div className="bg-white border rounded-xl p-4 mb-6 flex gap-4 items-center">
        <label className="font-medium text-gray-700">Ученик:</label>
        <select 
          value={selectedChild} 
          onChange={e => setSelectedChild(e.target.value)} 
          className="border rounded-lg px-3 py-2 w-64"
        >
          {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        
        <button 
          onClick={() => setShowForm(true)}
          className="ml-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          + Добавить работу
        </button>
      </div>

      {showForm && (
        <form onSubmit={createItem} className="bg-white border rounded-xl p-6 mb-6">
          <h3 className="font-medium text-lg mb-4">Новая работа</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тип материала</label>
              <select 
                value={form.type} 
                onChange={e => setForm(p => ({...p, type: e.target.value}))}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="photo">Фотография</option>
                <option value="video">Видео</option>
                <option value="document">Документ / Рисунок</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Файл</label>
              <FileUpload onUpload={urls => setForm(p => ({ ...p, fileUrl: urls[0] || '' }))} />
              {form.fileUrl && (
                <div className="mt-2 bg-gray-50 p-2 rounded border text-xs text-green-700 truncate">
                  Файл загружен
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Название работы</label>
              <input 
                type="text" 
                required
                value={form.title}
                onChange={e => setForm(p => ({...p, title: e.target.value}))}
                className="w-full border rounded-lg px-3 py-2" 
                placeholder="Рисунок акварелью..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание (опционально)</label>
              <textarea 
                value={form.description}
                onChange={e => setForm(p => ({...p, description: e.target.value}))}
                className="w-full border rounded-lg px-3 py-2 h-20"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Сохранение...' : 'Загрузить'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg border hover:bg-gray-50 text-gray-700">
              Отмена
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white border rounded-xl">
            Портфолио пока пустое
          </div>
        ) : items.map(item => (
          <div key={item.id} className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-48 bg-gray-100 flex items-center justify-center overflow-hidden">
              {/* Fallback rendering of image if URL is provided */}
              {item.fileUrl ? (
                <AuthMedia src={item.fileUrl} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-4xl">📄</span>
              )}
            </div>
            <div className="p-4">
              <div className="text-xs text-gray-400 font-medium mb-1 uppercase">{item.type}</div>
              <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1" title={item.title}>{item.title}</h4>
              {item.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-2">{item.description}</p>
              )}
              <div className="text-xs text-gray-400 mt-2">
                {new Date(item.date).toLocaleDateString('ru')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
