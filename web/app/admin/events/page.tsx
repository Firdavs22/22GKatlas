'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge } from '@/components/ui';
import FileUpload from '@/components/FileUpload';
import api from '@/lib/api';
import AuthMedia from '@/components/AuthMedia';

interface EventItem {
  id: string;
  title: string;
  description?: string;
  eventDate: string;
  mediaUrls: string[];
}

const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function AdminEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  const load = () => {
    api.get('/activities/events').then(r => {
      setEvents(r.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/activities/events', { title, description, eventDate, mediaUrls });
      setFormOpen(false);
      setTitle('');
      setDescription('');
      setEventDate('');
      setMediaUrls([]);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка при сохранении');
    }
  };

  const del = async (id: string) => {
    if (!confirm('Удалить событие?')) return;
    await api.delete(`/activities/events/${id}`);
    load();
  };

  const upcoming = events.filter(e => new Date(e.eventDate) >= new Date()).length;

  return (
    <PageLayout
      eyebrow={`Впереди событий: ${upcoming}`}
      title="События"
      actions={
        <Button variant="primary" size="sm" onClick={() => setFormOpen(v => !v)}>
          <Plus size={16} />
          {formOpen ? 'Закрыть' : 'Добавить событие'}
        </Button>
      }
    >
      <p className="text-sm text-slate-500 mb-6">
        Создавайте праздники, утренники и объявления. События появятся у родителей в ленте.
      </p>

      {formOpen && (
        <Card padding="md" className="mb-6">
          <h3 className="font-serif text-xl mb-4">Новое событие</h3>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Название
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="Праздник Осени"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Дата события
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                required
                className={`${inputCls} md:w-1/2`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Описание
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="Подробности для родителей…"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">
                Медиа
              </label>
              <FileUpload onUpload={urls => setMediaUrls(p => [...p, ...urls])} multiple />
              {mediaUrls.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {mediaUrls.map((url, i) => (
                    <div key={i} className="w-16 h-16 rounded-lg overflow-hidden bg-brand-pale/40 shrink-0">
                      <AuthMedia src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" variant="primary" className="w-full">
              Опубликовать
            </Button>
          </form>
        </Card>
      )}

      {loading ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-8 text-center">Загрузка…</div>
        </Card>
      ) : events.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            Пока нет запланированных событий
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map(evt => {
            const isPast = new Date(evt.eventDate) < new Date();
            return (
              <Card key={evt.id} padding="md" className={isPast ? 'opacity-70' : ''}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <Badge tone={isPast ? 'neutral' : 'brand'}>
                    <Calendar size={11} />
                    {new Date(evt.eventDate).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </Badge>
                  <button
                    onClick={() => del(evt.id)}
                    className="p-1.5 text-slate-400 hover:text-danger transition-colors"
                    title="Удалить"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <h3 className="font-serif text-2xl mb-2">{evt.title}</h3>
                {evt.description && (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {evt.description}
                  </p>
                )}
                {evt.mediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {evt.mediaUrls.map((url, i) => (
                      <div key={i} className="aspect-square rounded-lg overflow-hidden bg-brand-pale/40">
                        <AuthMedia src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
