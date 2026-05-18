'use client';
import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight, FileSpreadsheet } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';
import { Area } from '@/lib/types';

interface SkillForm {
  title: string;
  description: string;
  ageRange: string;
  groupId: string;
  developsEmotion: boolean;
  developsCognition: boolean;
  developsBody: boolean;
}

const EMPTY_SKILL: SkillForm = {
  title: '', description: '', ageRange: '', groupId: '',
  developsEmotion: false, developsCognition: false, developsBody: false,
};

const AGE_OPTIONS = ['0-3', '3-6', '6-9', '9-12', '3-12'];
const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function AdminSkills() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const [areaFormOpen, setAreaFormOpen] = useState(false);
  const [areaForm, setAreaForm] = useState({ title: '', icon: 'A', color: '#0F5192' });

  const [sgFormFor, setSgFormFor] = useState('');
  const [sgForm, setSgForm] = useState({ title: '' });

  const [skillFormFor, setSkillFormFor] = useState('');
  const [skillForm, setSkillForm] = useState<SkillForm>({ ...EMPTY_SKILL });
  const [editingSkill, setEditingSkill] = useState<string | null>(null);

  const reload = () => api.get('/admin/areas').then(r => setAreas(r.data));
  useEffect(() => { reload(); }, []);

  const toggle = (id: string) =>
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  const toggleGroup = (id: string) =>
    setExpandedGroups(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const createArea = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/admin/areas', { ...areaForm, sortOrder: areas.length });
    setAreaFormOpen(false);
    setAreaForm({ title: '', icon: 'A', color: '#0F5192' });
    reload();
  };
  const deleteArea = async (id: string) => {
    if (!confirm('Удалить зону и все её группы/навыки?')) return;
    try {
      await api.delete(`/admin/areas/${id}`);
      reload();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Не удалось удалить зону');
    }
  };

  const createSG = async (e: React.FormEvent) => {
    e.preventDefault();
    const area = areas.find(a => a.id === sgFormFor);
    await api.post('/admin/skill-groups', {
      ...sgForm,
      areaId: sgFormFor,
      sortOrder: area?.groups?.length || 0,
    });
    setSgFormFor('');
    setSgForm({ title: '' });
    reload();
  };
  const deleteSG = async (id: string) => {
    if (!confirm('Удалить группу навыков?')) return;
    try {
      await api.delete(`/admin/skill-groups/${id}`);
      reload();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Нельзя удалить группу с навыками');
    }
  };

  const createSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const sg = areas.flatMap(a => a.groups || []).find(g => g.id === skillFormFor);
    await api.post('/admin/skills', {
      ...skillForm,
      groupId: skillFormFor,
      sortOrder: sg?.skills?.length || 0,
    });
    setSkillFormFor('');
    setSkillForm({ ...EMPTY_SKILL });
    reload();
  };
  const updateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;
    await api.put(`/admin/skills/${editingSkill}`, skillForm);
    setEditingSkill(null);
    setSkillForm({ ...EMPTY_SKILL });
    reload();
  };
  const deleteSkill = async (id: string) => {
    if (!confirm('Удалить навык?')) return;
    try {
      await api.delete(`/admin/skills/${id}`);
      reload();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'Навык имеет прогресс, используйте архивирование');
    }
  };
  const startEditSkill = (s: {
    id: string;
    title: string;
    description?: string;
    ageRange?: string;
    groupId?: string;
    developsEmotion?: boolean;
    developsCognition?: boolean;
    developsBody?: boolean;
  }) => {
    setEditingSkill(s.id);
    setSkillForm({
      title: s.title,
      description: s.description || '',
      ageRange: s.ageRange || '',
      groupId: s.groupId || '',
      developsEmotion: Boolean(s.developsEmotion),
      developsCognition: Boolean(s.developsCognition),
      developsBody: Boolean(s.developsBody),
    });
  };

  const importExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/admin/skills/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert(`Импортировано: ${data.imported} навыков, ${data.areas} зон, ${data.skillGroups} групп`);
      reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
      alert('Ошибка импорта: ' + msg);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <PageLayout
      eyebrow={`${areas.length} ${areas.length === 1 ? 'зона' : areas.length < 5 ? 'зоны' : 'зон'} развития`}
      title="Навыки"
      wide
      actions={
        <>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={importExcel} className="hidden" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            <FileSpreadsheet size={16} />
            {importing ? 'Импорт…' : 'Из Excel'}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setAreaFormOpen(true)}>
            <Plus size={16} />
            Зона
          </Button>
        </>
      }
    >
      <Card padding="md" variant="pale" className="mb-4 text-xs text-slate-600">
        <strong className="text-foreground">Формат Excel:</strong> колонки{' '}
        <code className="px-1 py-0.5 rounded bg-slate-100 text-foreground">Зона</code>, <code className="px-1 py-0.5 rounded bg-slate-100 text-foreground">Группа</code>,{' '}
        <code className="px-1 py-0.5 rounded bg-slate-100 text-foreground">Навык</code>, <code className="px-1 py-0.5 rounded bg-slate-100 text-foreground">Описание</code> (опц.),{' '}
        <code className="px-1 py-0.5 rounded bg-slate-100 text-foreground">Возраст</code> (опц., напр. 3-6)
      </Card>

      {areaFormOpen && (
        <Card padding="md" className="mb-4">
          <h3 className="font-serif text-xl mb-4">Новая зона развития</h3>
          <form onSubmit={createArea} className="grid grid-cols-3 gap-3">
            <input
              value={areaForm.title}
              onChange={e => setAreaForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Название зоны"
              className={`${inputCls} col-span-2`}
              required
            />
            <div className="flex gap-2">
              <input
                value={areaForm.icon}
                onChange={e => setAreaForm(p => ({ ...p, icon: e.target.value }))}
                placeholder="Метка"
                className={`${inputCls} w-20 text-center`}
              />
              <input
                type="color"
                value={areaForm.color}
                onChange={e => setAreaForm(p => ({ ...p, color: e.target.value }))}
                className="w-12 h-10 rounded-xl border border-slate-200 cursor-pointer bg-white"
              />
            </div>
            <div className="col-span-3 flex gap-2">
              <Button type="submit" variant="primary">Создать</Button>
              <Button type="button" variant="outline" onClick={() => setAreaFormOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      )}

      {editingSkill && (
        <Card padding="md" className="mb-4 border-brand-soft">
          <SectionLabel>Редактировать навык</SectionLabel>
          <form onSubmit={updateSkill} className="space-y-3 mt-3">
            <input
              value={skillForm.title}
              onChange={e => setSkillForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Название навыка"
              className={inputCls}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <textarea
                value={skillForm.description}
                onChange={e => setSkillForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Описание и развиваемые навыки"
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
              />
              <select
                value={skillForm.ageRange}
                onChange={e => setSkillForm(p => ({ ...p, ageRange: e.target.value }))}
                className={inputCls}
              >
                <option value="">Возраст не указан</option>
                {AGE_OPTIONS.map(a => <option key={a} value={a}>{a} лет</option>)}
              </select>
            </div>
            <DimensionPicker form={skillForm} onChange={setSkillForm} />
            <div className="flex gap-2">
              <Button type="submit" variant="primary">Сохранить</Button>
              <Button type="button" variant="outline" onClick={() => setEditingSkill(null)}>
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {areas.map(area => (
          <Card key={area.id} padding="none" className="overflow-hidden">
            <button
              onClick={() => toggle(area.id)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-serif text-lg"
                  style={{ backgroundColor: `${area.color}22`, color: area.color }}
                >
                  {area.icon}
                </div>
                <div className="text-left">
                  <div className="font-serif text-lg" style={{ color: area.color }}>
                    {area.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {area.groups?.length || 0} групп
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  onClick={e => { e.stopPropagation(); deleteArea(area.id); }}
                  className="p-1.5 text-slate-400 hover:text-danger transition-colors cursor-pointer"
                  title="Удалить зону"
                >
                  <Trash2 size={15} />
                </span>
                {expanded.has(area.id) ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
              </div>
            </button>

            {expanded.has(area.id) && (
              <div className="border-t border-slate-100">
                {area.groups?.map(group => (
                  <div key={group.id} className="border-b border-slate-100 last:border-0">
                    <div
                      onClick={() => toggleGroup(group.id)}
                      className="cursor-pointer px-5 py-2.5 bg-slate-50/40 hover:bg-slate-50 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {expandedGroups.has(group.id) ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                        {group.title}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setExpandedGroups(p => new Set(p).add(group.id));
                            setSkillFormFor(group.id);
                            setSkillForm({ ...EMPTY_SKILL, groupId: group.id });
                          }}
                          className="p-1.5 text-slate-400 hover:text-brand transition-colors"
                          title="Добавить навык"
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); deleteSG(group.id); }}
                          className="p-1.5 text-slate-400 hover:text-danger transition-colors"
                          title="Удалить группу"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {expandedGroups.has(group.id) && (
                      <div>
                        {skillFormFor === group.id && (
                          <form
                            onSubmit={createSkill}
                            className="px-5 py-3 bg-brand-pale/30 space-y-2 border-b border-slate-100"
                          >
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                value={skillForm.title}
                                onChange={e => setSkillForm(p => ({ ...p, title: e.target.value }))}
                                placeholder="Название навыка"
                                className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                                required
                              />
                              <textarea
                                value={skillForm.description}
                                onChange={e => setSkillForm(p => ({ ...p, description: e.target.value }))}
                                placeholder="Описание"
                                rows={1}
                                className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                              />
                              <select
                                value={skillForm.ageRange}
                                onChange={e => setSkillForm(p => ({ ...p, ageRange: e.target.value }))}
                                className="h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                              >
                                <option value="">Возраст</option>
                                {AGE_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                              </select>
                            </div>
                            <DimensionPicker form={skillForm} onChange={setSkillForm} />
                            <div className="flex gap-2">
                              <Button type="submit" variant="primary" size="sm">Добавить</Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => setSkillFormFor('')}>
                                Отмена
                              </Button>
                            </div>
                          </form>
                        )}

                        {group.skills && group.skills.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-100">
                                  <th className="text-left text-[10px] font-medium uppercase tracking-wider text-slate-500 px-5 py-2">
                                    Навык
                                  </th>
                                  <th className="text-left text-[10px] font-medium uppercase tracking-wider text-slate-500 px-3 py-2">
                                    Описание
                                  </th>
                                  <th className="text-center text-[10px] font-medium uppercase tracking-wider text-slate-500 px-3 py-2">
                                    Возраст
                                  </th>
                                  <th className="w-10" />
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {group.skills.map(skill => {
                                  const parts = skill.description?.split('Развиваемые навыки:') || [];
                                  const descText = parts[0]?.trim() || '';
                                  return (
                                    <tr key={skill.id} className="group/skill hover:bg-slate-50/40">
                                      <td className="px-5 py-3 font-medium">{skill.title}</td>
                                      <td className="px-3 py-3 text-xs text-slate-600 max-w-md">
                                        {descText || <span className="text-slate-300 italic">Нет описания</span>}
                                      </td>
                                      <td className="px-3 py-3 text-center">
                                        {skill.ageRange ? (
                                          <Badge tone="brand">{skill.ageRange}</Badge>
                                        ) : <span className="text-slate-300">—</span>}
                                      </td>
                                      <td className="px-3 py-3 text-right whitespace-nowrap opacity-0 group-hover/skill:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => startEditSkill(skill)}
                                          className="p-1.5 text-slate-400 hover:text-brand transition-colors"
                                        >
                                          <Pencil size={14} />
                                        </button>
                                        <button
                                          onClick={() => deleteSkill(skill.id)}
                                          className="p-1.5 text-slate-400 hover:text-danger transition-colors"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="px-5 py-3 text-xs text-slate-400 italic text-center">
                            Нет добавленных навыков
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {sgFormFor === area.id ? (
                  <form onSubmit={createSG} className="px-5 py-3 bg-success/10 flex gap-2 items-center">
                    <input
                      value={sgForm.title}
                      onChange={e => setSgForm({ title: e.target.value })}
                      placeholder="Название группы навыков"
                      className="flex-1 h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      required
                    />
                    <Button type="submit" variant="primary" size="sm">Добавить</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSgFormFor('')}>
                      Отмена
                    </Button>
                  </form>
                ) : (
                  <button
                    onClick={() => setSgFormFor(area.id)}
                    className="w-full px-5 py-2.5 text-sm text-brand hover:bg-brand-pale/30 text-left inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Plus size={14} /> Добавить группу навыков
                  </button>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}

function DimensionPicker({
  form,
  onChange,
}: {
  form: SkillForm;
  onChange: (updater: (p: SkillForm) => SkillForm) => void;
}) {
  const items: { key: keyof SkillForm; label: string; tone: string }[] = [
    { key: 'developsEmotion',   label: '❤ Эмоции и общение',   tone: 'bg-pink-50 border-pink-200 text-pink-900' },
    { key: 'developsCognition', label: '🧠 Мышление и память', tone: 'bg-violet-50 border-violet-200 text-violet-900' },
    { key: 'developsBody',      label: '🏃 Тело и движение',   tone: 'bg-teal-50 border-teal-200 text-teal-900' },
  ];
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
        Развивает измерения
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map(it => {
          const checked = Boolean(form[it.key]);
          return (
            <label
              key={it.key as string}
              className={`inline-flex items-center gap-2 px-3 h-8 rounded-full border text-xs cursor-pointer transition-colors ${
                checked ? it.tone : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(p => ({ ...p, [it.key]: e.target.checked }))}
                className="w-3.5 h-3.5"
              />
              {it.label}
            </label>
          );
        })}
      </div>
    </div>
  );
}
