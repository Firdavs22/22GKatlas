'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Eye, EyeOff } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import ChildProfileCard from '@/components/ChildProfileCard';
import { Card, Button, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';
import { SpecialistNote } from '@/lib/types';

const VISIBILITY: Record<string, string> = {
  specialist_only: 'Только я',
  with_teacher: 'Педагог',
  with_parent: 'Родитель',
};

interface SpecialistChildViewProps {
  /** Note types mapping (varies between psychologist and pediatrician). */
  noteTypes: Record<string, string>;
  /** Default type for the new-note form. */
  defaultType: string;
  /** Page title (e.g. "Карта подопечного"). */
  eyebrow: string;
}

interface ChildResp {
  name?: string;
  [key: string]: unknown;
}

const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function SpecialistChildView({
  noteTypes,
  defaultType,
  eyebrow,
}: SpecialistChildViewProps) {
  const { id } = useParams<{ id: string }>();
  const [child, setChild] = useState<ChildResp | null>(null);
  const [notes, setNotes] = useState<SpecialistNote[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    type: defaultType,
    text: '',
    recommendations: '',
    visibility: 'specialist_only',
  });

  useEffect(() => {
    api.get(`/children/${id}`).then(r => setChild(r.data));
    api.get(`/children/${id}/notes`).then(r => setNotes(r.data));
  }, [id]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await api.post(`/children/${id}/notes`, form);
    setNotes(prev => [data, ...prev]);
    setFormOpen(false);
    setForm({
      type: defaultType,
      text: '',
      recommendations: '',
      visibility: 'specialist_only',
    });
  };

  return (
    <PageLayout
      eyebrow={eyebrow}
      title={child?.name || 'Карточка'}
      actions={
        <Button variant="primary" size="sm" onClick={() => setFormOpen(v => !v)}>
          <Plus size={16} />
          {formOpen ? 'Закрыть' : 'Новая запись'}
        </Button>
      }
    >
      <ChildProfileCard child={child} />

      {formOpen && (
        <Card padding="md" className="mb-6">
          <h3 className="font-serif text-xl mb-4">Новая запись</h3>
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Тип
                </label>
                <select
                  value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className={inputCls}
                >
                  {Object.entries(noteTypes).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Видимость
                </label>
                <select
                  value={form.visibility}
                  onChange={e => setForm(p => ({ ...p, visibility: e.target.value }))}
                  className={inputCls}
                >
                  {Object.entries(VISIBILITY).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Текст записи
              </label>
              <textarea
                value={form.text}
                onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
                placeholder="Подробное описание…"
                rows={4}
                required
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Рекомендации
              </label>
              <textarea
                value={form.recommendations}
                onChange={e => setForm(p => ({ ...p, recommendations: e.target.value }))}
                placeholder="Что делать дальше…"
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="primary">Сохранить</Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      )}

      <SectionLabel>История записей</SectionLabel>
      <div className="space-y-3 mt-3">
        {notes.length === 0 ? (
          <Card padding="md">
            <div className="text-sm text-slate-400 py-8 text-center">Записей пока нет</div>
          </Card>
        ) : (
          notes.map(n => {
            const isPrivate = n.visibility === 'specialist_only';
            return (
              <Card key={n.id} padding="md">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <Badge tone="brand">{noteTypes[n.type] || n.type}</Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    {isPrivate ? <EyeOff size={12} /> : <Eye size={12} />}
                    {VISIBILITY[n.visibility] || n.visibility}
                  </span>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {n.text}
                </p>
                {n.recommendations && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                      Рекомендации
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {n.recommendations}
                    </p>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </PageLayout>
  );
}
