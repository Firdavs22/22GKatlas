'use client';
import { useEffect, useState } from 'react';
import { Upload, Video, FileText, Image as ImageIcon } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button } from '@/components/ui';
import api from '@/lib/api';
import { Child } from '@/lib/types';
import FileUpload from '@/components/FileUpload';
import AuthMedia from '@/components/AuthMedia';
import Lightbox from '@/components/Lightbox';
import { normalizePortfolioType } from '@/lib/media';

interface PortfolioItem {
  id: string;
  childId: string;
  type: 'photo' | 'video' | 'document' | string;
  title: string;
  description: string | null;
  fileUrl: string;
  date: string;
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function TeacherPortfolio() {
  const [children, setChildren] = useState<Child[]>([]);
  const [items, setItems] = useState<(PortfolioItem & { childName?: string })[]>([]);
  const [childFilter, setChildFilter] = useState<string>('all');

  const [lightbox, setLightbox] = useState<string | null>(null);

  // Upload form
  const [formOpen, setFormOpen] = useState(false);
  const [formChildId, setFormChildId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<'photo' | 'video' | 'document'>('photo');
  const [formFileUrl, setFormFileUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data[0]) setFormChildId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (children.length === 0) return;
    Promise.all(
      children.map(c =>
        api
          .get(`/children/${c.id}/portfolio`)
          .then(r =>
            (r.data as PortfolioItem[]).map(it => ({ ...it, childName: c.name })),
          )
          .catch(() => []),
      ),
    ).then(lists => {
      const merged = lists
        .flat()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setItems(merged);
    });
  }, [children]);

  const filtered = childFilter === 'all' ? items : items.filter(i => i.childId === childFilter);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChildId || !formTitle.trim() || !formFileUrl) return;
    setSaving(true);
    try {
      const { data } = await api.post(`/children/${formChildId}/portfolio`, {
        title: formTitle,
        description: formDescription,
        type: formType,
        fileUrl: formFileUrl,
      });
      const childName = children.find(c => c.id === formChildId)?.name;
      setItems(prev => [{ ...data, childName }, ...prev]);
      setFormOpen(false);
      setFormTitle('');
      setFormDescription('');
      setFormFileUrl('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      eyebrow="Работы детей"
      title="Портфолио"
      wide
      actions={
        <>
          <select
            value={childFilter}
            onChange={e => setChildFilter(e.target.value)}
            className="h-9 px-3 text-sm rounded-full border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            <option value="all">Все дети</option>
            {children.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Button variant="primary" size="sm" onClick={() => setFormOpen(v => !v)}>
            <Upload size={16} />
            Загрузить работу
          </Button>
        </>
      }
    >
      {formOpen && (
        <Card padding="md" className="mb-6">
          <h3 className="font-serif text-xl mb-4">Новая работа</h3>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Тип
              </label>
              <select
                value={formType}
                onChange={e => setFormType(e.target.value as 'photo' | 'video' | 'document')}
                className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="photo">Фото</option>
                <option value="video">Видео</option>
                <option value="document">Документ</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Название работы
              </label>
              <input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                required
                placeholder="Линия времени, Рисунок мамы…"
                className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Описание
              </label>
              <textarea
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <FileUpload onUpload={urls => setFormFileUrl(urls[0] || '')} label="Файл" />
              {formFileUrl && <div className="text-xs text-success mt-2">Файл загружен</div>}
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Сохранение…' : 'Загрузить'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">
            В портфолио пока пусто
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(item => {
            const kind = normalizePortfolioType(item.type, item.fileUrl);
            return (
            <Card key={item.id} padding="none" className="overflow-hidden">
              <div className="aspect-[4/3] bg-brand-pale/40 relative">
                {kind === 'photo' && item.fileUrl ? (
                  <button
                    type="button"
                    onClick={() => setLightbox(item.fileUrl)}
                    className="w-full h-full cursor-zoom-in"
                  >
                    <AuthMedia preview src={item.fileUrl} alt={item.title} className="w-full h-full object-cover" />
                  </button>
                ) : kind === 'video' ? (
                  <div className="w-full h-full flex items-center justify-center text-brand/60">
                    <Video size={32} strokeWidth={1.5} />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-brand/60">
                    <FileText size={32} strokeWidth={1.5} />
                  </div>
                )}
                {kind === 'video' && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 text-white text-[11px]">
                    <Video size={12} /> видео
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <span className="text-xs text-slate-500">{shortName(item.childName || '')}</span>
                  <span className="text-xs text-slate-400">{formatShortDate(item.date)}</span>
                </div>
                <h4 className="font-serif text-lg leading-tight">{item.title}</h4>
                {item.description && (
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{item.description}</p>
                )}
              </div>
            </Card>
            );
          })}
        </div>
      )}
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </PageLayout>
  );
}
