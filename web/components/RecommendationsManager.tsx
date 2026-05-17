'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X, AlertTriangle } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import api from '@/lib/api';
import { Child, SkillGroup } from '@/lib/types';

export interface Recommendation {
  id: string;
  childId: string;
  skillId?: string | null;
  authorRole?: string | null;
  title: string;
  description: string | null;
  tags?: string[];
  status: 'pending' | 'done';
  createdAt: string;
  updatedAt: string;
  skill?: { id: string; title: string } | null;
}

interface ManagerProps {
  /** Suggested quick-pick tags (e.g. ['Важно', 'Вакцинация'] for pediatrician). */
  suggestedTags?: string[];
  /** Allow attaching a developmental skill (only useful for teachers). */
  showSkillSelect?: boolean;
  /** Whether the actor is allowed to delete (true for staff). */
  canDelete?: boolean;
  /** Title shown on the page. */
  emptyHint?: string;
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function RecommendationsManager({
  suggestedTags = [],
  showSkillSelect = false,
  canDelete = true,
  emptyHint = 'Рекомендаций пока нет',
}: ManagerProps) {
  const [children, setChildren] = useState<Child[]>([]);
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);
  const [tasks, setTasks] = useState<(Recommendation & { childName?: string })[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formChildId, setFormChildId] = useState('');
  const [formSkillId, setFormSkillId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data[0]) setFormChildId(r.data[0].id);
    });
    if (showSkillSelect) {
      api.get('/admin/skill-groups').then(r => setSkillGroups(r.data)).catch(() => {});
    }
  }, [showSkillSelect]);

  useEffect(() => {
    if (children.length === 0) return;
    Promise.all(
      children.map(c =>
        api
          .get(`/children/${c.id}/home-tasks`)
          .then(r => (r.data as Recommendation[]).map(t => ({ ...t, childName: c.name })))
          .catch(() => []),
      ),
    ).then(lists => {
      const merged = lists
        .flat()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setTasks(merged);
    });
  }, [children]);

  const skillIndex = useMemo(() => {
    const m = new Map<string, { title: string; group: string }>();
    for (const g of skillGroups) {
      for (const s of g.skills || []) {
        m.set(s.id, { title: s.title, group: g.title });
      }
    }
    return m;
  }, [skillGroups]);

  const toggleTag = (tag: string) => {
    setFormTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  const addCustomTag = () => {
    const t = customTag.trim();
    if (t && !formTags.includes(t)) setFormTags(prev => [...prev, t]);
    setCustomTag('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChildId || !formTitle.trim()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        tags: formTags,
      };
      if (showSkillSelect && formSkillId) payload.skillId = formSkillId;
      const { data } = await api.post(`/children/${formChildId}/home-tasks`, payload);
      const childName = children.find(c => c.id === formChildId)?.name;
      setTasks(prev => [{ ...data, childName }, ...prev]);
      setFormOpen(false);
      setFormSkillId('');
      setFormTitle('');
      setFormDescription('');
      setFormTags([]);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (task: Recommendation) => {
    if (!confirm('Удалить рекомендацию?')) return;
    await api.delete(`/children/${task.childId}/home-tasks/${task.id}`);
    setTasks(prev => prev.filter(t => t.id !== task.id));
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button variant="primary" size="sm" onClick={() => setFormOpen(v => !v)}>
          <Plus size={16} />
          Новая рекомендация
        </Button>
      </div>

      {formOpen && (
        <Card padding="md" className="mb-6">
          <h3 className="font-serif text-xl mb-4">Новая рекомендация</h3>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Ребёнок
              </label>
              <select
                value={formChildId}
                onChange={e => setFormChildId(e.target.value)}
                className={inputCls}
              >
                {children.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {showSkillSelect && (
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                  Навык (опц.)
                </label>
                <select
                  value={formSkillId}
                  onChange={e => {
                    const id = e.target.value;
                    const sk = skillIndex.get(id);
                    setFormSkillId(id);
                    if (sk && !formTitle) setFormTitle(`Повторить: ${sk.title}`);
                  }}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {skillGroups.map(g => g.skills?.length ? (
                    <optgroup key={g.id} label={g.title}>
                      {g.skills.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </optgroup>
                  ) : null)}
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Заголовок
              </label>
              <input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                required
                placeholder="Например: Записаться на плановую вакцинацию"
                className={inputCls}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
                Описание
              </label>
              <textarea
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                rows={3}
                placeholder="Подробности для родителей…"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
              />
            </div>

            {(suggestedTags.length > 0 || formTags.length > 0) && (
              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-2">
                  Теги
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {suggestedTags.map(t => {
                    const active = formTags.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTag(t)}
                        className={`px-3 h-7 text-xs rounded-full transition-colors ${
                          active
                            ? 'bg-brand text-white'
                            : 'border border-slate-200 text-slate-600 hover:border-brand'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                  {formTags
                    .filter(t => !suggestedTags.includes(t))
                    .map(t => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2 h-7 text-xs rounded-full bg-brand-pale text-brand"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() => toggleTag(t)}
                          className="text-brand/70 hover:text-brand"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={customTag}
                    onChange={e => setCustomTag(e.target.value)}
                    placeholder="Добавить тег"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomTag();
                      }
                    }}
                    className={`${inputCls} max-w-xs`}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addCustomTag}>
                    Добавить
                  </Button>
                </div>
              </div>
            )}

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Сохранение…' : 'Опубликовать'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tasks.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-12 text-center">{emptyHint}</div>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map(t => {
            const done = t.status === 'done';
            const important = (t.tags || []).some(x => /важно|важн/i.test(x));
            return (
              <Card key={t.id} padding="md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {important && <AlertTriangle size={14} className="text-danger" />}
                      <span className="text-xs text-slate-500">{shortName(t.childName || '')}</span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-500">{formatDate(t.updatedAt)}</span>
                    </div>
                    <div className="font-medium text-sm">{t.title}</div>
                    {t.description && (
                      <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{t.description}</p>
                    )}
                    {(t.tags?.length || t.skill?.title) && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {t.skill?.title && <Badge tone="brand">{t.skill.title}</Badge>}
                        {t.tags?.map(tag => (
                          <Badge
                            key={tag}
                            tone={/важно|важн/i.test(tag) ? 'danger' : 'neutral'}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={done ? 'success' : 'warn'} dot>
                      {done ? 'выполнено' : 'в работе'}
                    </Badge>
                    {canDelete && (
                      <button
                        onClick={() => remove(t)}
                        className="text-slate-400 hover:text-danger transition-colors p-1"
                        title="Удалить"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
