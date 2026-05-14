'use client';
import { useEffect, useState } from 'react';
import { Plus, Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';
import { Child, Observation } from '@/lib/types';
import FileUpload from '@/components/FileUpload';
import AuthMedia from '@/components/AuthMedia';

interface Area { id: string; title: string; }

function nameInitial(name?: string): string {
  return (name?.trim()?.charAt(0) || '?').toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export default function TeacherDiary() {
  const [children, setChildren] = useState<Child[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [childFilter, setChildFilter] = useState<string>('all');

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formChildId, setFormChildId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formAreaId, setFormAreaId] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateDescription = async () => {
    const title = formTitle.trim();
    if (!title) return;
    setGenerating(true);
    try {
      const area = areas.find(a => a.id === formAreaId);
      const { data } = await api.post('/ai/observation', {
        title,
        area: area ? { id: area.id, title: area.title } : undefined,
      });
      if (data?.text) setFormText(data.text);
    } catch (err) {
      console.warn('AI generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data[0]) setFormChildId(r.data[0].id);
    });
    api.get('/admin/areas').then(r => setAreas(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    // Load observations across all teacher's children
    if (children.length === 0) return;
    Promise.all(
      children.map(c =>
        api.get(`/children/${c.id}/observations`).then(r =>
          (r.data as Observation[]).map(o => ({ ...o, childId: c.id, childName: (c.name as string) })),
        ).catch(() => []),
      ),
    ).then(lists => {
      const merged = (lists.flat() as (Observation & { childName?: string })[]).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setObservations(merged);
    });
  }, [children]);

  const visibleObservations = observations.filter(o =>
    childFilter === 'all' ? true : o.childId === childFilter,
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChildId || !formText.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/children/${formChildId}/observations`, {
        title: formTitle || undefined,
        text: formText,
        visible: formVisible,
        photos: formPhotos,
        areaId: formAreaId || undefined,
      });
      const childName = children.find(c => c.id === formChildId)?.name;
      setObservations(prev => [{ ...data, childName }, ...prev]);
      setFormOpen(false);
      setFormTitle('');
      setFormText('');
      setFormAreaId('');
      setFormVisible(false);
      setFormPhotos([]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      eyebrow="Наблюдения за детьми"
      title="Дневник"
      wide
      actions={
        <>
          <div className="relative">
            <select
              value={childFilter}
              onChange={e => setChildFilter(e.target.value)}
              className="h-9 px-3 text-sm rounded-full border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 appearance-none cursor-pointer pr-8"
            >
              <option value="all">Все дети</option>
              {children.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Button variant="primary" size="sm" onClick={() => setFormOpen(v => !v)}>
            <Plus size={16} />
            Новое наблюдение
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Observations list */}
        <div className="space-y-3">
          {visibleObservations.length === 0 ? (
            <Card padding="md">
              <div className="text-sm text-slate-400 py-8 text-center">
                Записей пока нет
              </div>
            </Card>
          ) : (
            visibleObservations.map(o => {
              const item = o as Observation & { childName?: string };
              const area = areas.find(a => a.id === item.areaId);
              return (
                <Card key={item.id} padding="md">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-pale flex items-center justify-center font-serif text-sm text-brand shrink-0">
                      {nameInitial(item.childName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3 mb-1">
                        <span className="font-medium text-sm">{item.childName}</span>
                        <span className="text-xs text-slate-500 shrink-0">
                          {formatDate(item.date)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-3">
                        {item.text}
                      </p>
                      {item.photos.length > 0 && (
                        <div className="flex gap-2 mb-3">
                          {item.photos.slice(0, 4).map((url, i) => (
                            <div key={i} className="w-16 h-16 rounded-lg overflow-hidden bg-brand-pale/40">
                              <AuthMedia preview src={url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs">
                        {area && <Badge tone="brand">{area.title}</Badge>}
                        {item.photos.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <ImageIcon size={12} /> {item.photos.length} фото
                          </span>
                        )}
                        <span className="ml-auto">
                          <Badge tone={item.visible ? 'success' : 'neutral'} dot>
                            {item.visible ? 'видно родителям' : 'только педагог'}
                          </Badge>
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* New observation form */}
        <aside>
          {formOpen ? (
            <Card padding="md">
              <SectionLabel>Новое наблюдение</SectionLabel>
              <h3 className="font-serif text-2xl mt-1 mb-4">Записать</h3>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                    Ребёнок
                  </label>
                  <select
                    value={formChildId}
                    onChange={e => setFormChildId(e.target.value)}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    {children.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {areas.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                      Область
                    </label>
                    <select
                      value={formAreaId}
                      onChange={e => setFormAreaId(e.target.value)}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    >
                      <option value="">—</option>
                      {areas.map(a => (
                        <option key={a.id} value={a.id}>{a.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                    Заголовок / упражнение
                  </label>
                  <input
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="Переливание воды, Розовая башня…"
                    className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      Описание
                    </label>
                    <button
                      type="button"
                      onClick={generateDescription}
                      disabled={!formTitle.trim() || generating}
                      className="inline-flex items-center gap-1 text-xs text-brand hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
                    >
                      {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      {generating ? 'Генерация…' : 'Сгенерировать'}
                    </button>
                  </div>
                  <textarea
                    value={formText}
                    onChange={e => setFormText(e.target.value)}
                    placeholder="Контекст, материал, длительность работы…"
                    required
                    rows={5}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                  />
                </div>
                <div>
                  <FileUpload
                    onUpload={urls => setFormPhotos(p => [...p, ...urls])}
                    label="Прикрепить фото"
                  />
                  {formPhotos.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {formPhotos.map((url, i) => (
                        <div key={i} className="w-12 h-12 rounded-lg overflow-hidden bg-brand-pale/40">
                          <AuthMedia preview src={url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <label className="flex items-center justify-between cursor-pointer text-sm">
                  <span className="font-medium">Видно родителям</span>
                  <span className="text-xs text-slate-500">они увидят в ленте</span>
                  <input
                    type="checkbox"
                    checked={formVisible}
                    onChange={e => setFormVisible(e.target.checked)}
                    className="ml-3 w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
                  />
                </label>
                <div className="flex gap-2">
                  <Button type="submit" variant="primary" disabled={saving} className="flex-1">
                    {saving ? 'Сохранение…' : 'Сохранить'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                    Отмена
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Card padding="md" variant="pale">
              <SectionLabel>Подсказка</SectionLabel>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Записывайте моменты концентрации, прорывы, конфликты. Отметка «видно родителям» сделает запись частью ленты ребёнка.
              </p>
            </Card>
          )}
        </aside>
      </div>
    </PageLayout>
  );
}
