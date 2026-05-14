'use client';
import { useState, useEffect } from 'react';
import { Megaphone, Send } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, SectionLabel } from '@/components/ui';
import api from '@/lib/api';

interface Broadcast {
  id: string;
  title: string;
  message: string;
  sentAt: string;
  targetGroups: string[];
}

interface GroupRow { id: string; name: string; }

const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function AdminBroadcasts() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetGroups, setTargetGroups] = useState<string[]>(['all']);

  const load = async () => {
    try {
      const [b, g] = await Promise.all([
        api.get('/activities/broadcasts'),
        api.get('/admin/groups'),
      ]);
      setBroadcasts(b.data);
      setGroups(g.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (groupId: string) => {
    setTargetGroups(prev => {
      if (groupId === 'all') return ['all'];
      let next = prev.filter(t => t !== 'all');
      if (next.includes(groupId)) next = next.filter(t => t !== groupId);
      else next.push(groupId);
      return next.length === 0 ? ['all'] : next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetGroups.length === 0) return alert('Выберите получателей');
    try {
      const res = await api.post('/activities/broadcasts', { title, message, targetGroups });
      alert(`Успешно отправлено: ${res.data.recipientsCount} получателей`);
      setFormOpen(false);
      setTitle('');
      setMessage('');
      setTargetGroups(['all']);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка при отправке');
    }
  };

  return (
    <PageLayout
      eyebrow={`${broadcasts.length} ${broadcasts.length === 1 ? 'рассылка' : broadcasts.length < 5 ? 'рассылки' : 'рассылок'}`}
      title="Рассылки"
      actions={
        <Button variant="primary" size="sm" onClick={() => setFormOpen(v => !v)}>
          <Megaphone size={16} />
          {formOpen ? 'Закрыть' : 'Новая рассылка'}
        </Button>
      }
    >
      <p className="text-sm text-slate-500 mb-6">
        Отправляйте уведомления родителям выбранных групп. Они появятся в разделе «Уведомления».
      </p>

      {formOpen && (
        <Card padding="md" className="mb-6">
          <h3 className="font-serif text-xl mb-4">Создать рассылку</h3>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <SectionLabel>Кому отправить</SectionLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setTargetGroups(['all'])}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    targetGroups.includes('all')
                      ? 'bg-brand text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Всем родителям
                </button>
                {groups.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggle(g.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      targetGroups.includes(g.id)
                        ? 'bg-brand text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Группа: {g.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Заголовок
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="Важное объявление"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Текст
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={5}
                placeholder="Напишите сообщение…"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
              />
            </div>
            <Button type="submit" variant="primary" className="w-full">
              <Send size={16} />
              Отправить рассылку
            </Button>
          </form>
        </Card>
      )}

      {loading ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-8 text-center">Загрузка…</div>
        </Card>
      ) : broadcasts.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            История рассылок пуста
          </div>
        </Card>
      ) : (
        <>
          <SectionLabel>История</SectionLabel>
          <div className="space-y-3 mt-3">
            {broadcasts.map(b => (
              <Card key={b.id} padding="md">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h4 className="font-serif text-xl">{b.title}</h4>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(b.sentAt).toLocaleString('ru-RU')} ·{' '}
                      {b.targetGroups.includes('all')
                        ? 'Всем родителям'
                        : `${b.targetGroups.length} ${b.targetGroups.length === 1 ? 'группе' : 'группам'}`}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap mt-3 pt-3 border-t border-slate-100">
                  {b.message}
                </p>
              </Card>
            ))}
          </div>
        </>
      )}
    </PageLayout>
  );
}
