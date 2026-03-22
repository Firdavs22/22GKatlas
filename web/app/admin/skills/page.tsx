'use client';
import { useEffect, useState, useRef } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Area } from '@/lib/types';

interface SkillForm { title: string; description: string; ageRange: string; groupId: string }

export default function AdminSkills() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  // Forms
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [areaForm, setAreaForm] = useState({ title: '', icon: '📚', color: '#6366f1' });
  const [showSGForm, setShowSGForm] = useState(''); // areaId
  const [sgForm, setSGForm] = useState({ title: '' });
  const [showSkillForm, setShowSkillForm] = useState(''); // sgId
  const [skillForm, setSkillForm] = useState<SkillForm>({ title: '', description: '', ageRange: '', groupId: '' });
  const [editingSkill, setEditingSkill] = useState<string | null>(null);

  const reload = () => api.get('/admin/areas').then(r => setAreas(r.data));
  useEffect(() => { reload(); }, []);

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    return next;
  });

  const toggleGroup = (id: string) => setExpandedGroups(prev => {
    const next = new Set(prev);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    return next;
  });

  // Area CRUD
  const createArea = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/admin/areas', { ...areaForm, sortOrder: areas.length });
    setShowAreaForm(false);
    setAreaForm({ title: '', icon: '📚', color: '#6366f1' });
    reload();
  };
  const deleteArea = async (id: string) => {
    if (!confirm('Удалить зону и все её группы/навыки?')) return;
    await api.delete(`/admin/areas/${id}`);
    reload();
  };

  // SkillGroup CRUD
  const createSG = async (e: React.FormEvent) => {
    e.preventDefault();
    const area = areas.find(a => a.id === showSGForm);
    await api.post('/admin/skill-groups', { ...sgForm, areaId: showSGForm, sortOrder: area?.groups?.length || 0 });
    setShowSGForm('');
    setSGForm({ title: '' });
    reload();
  };
  const deleteSG = async (id: string) => {
    if (!confirm('Удалить группу навыков?')) return;
    try {
      await api.delete(`/admin/skill-groups/${id}`);
      reload();
    } catch { alert('Нельзя удалить группу с навыками'); }
  };

  // Skill CRUD
  const createSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const sg = areas.flatMap(a => a.groups || []).find(g => g.id === showSkillForm);
    await api.post('/admin/skills', { ...skillForm, groupId: showSkillForm, sortOrder: sg?.skills?.length || 0 });
    setShowSkillForm('');
    setSkillForm({ title: '', description: '', ageRange: '', groupId: '' });
    reload();
  };
  const updateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;
    await api.put(`/admin/skills/${editingSkill}`, skillForm);
    setEditingSkill(null);
    setSkillForm({ title: '', description: '', ageRange: '', groupId: '' });
    reload();
  };
  const deleteSkill = async (id: string) => {
    if (!confirm('Удалить навык?')) return;
    try {
      await api.delete(`/admin/skills/${id}`);
      reload();
    } catch { alert('Навык имеет прогресс, используйте архивирование'); }
  };
  const startEditSkill = (skill: { id: string; title: string; description?: string; ageRange?: string; groupId?: string }) => {
    setEditingSkill(skill.id);
    setSkillForm({ title: skill.title, description: skill.description || '', ageRange: skill.ageRange || '', groupId: skill.groupId || '' });
  };

  // Excel import
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
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
      alert('Ошибка импорта: ' + message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const AGE_OPTIONS = ['0-3', '3-6', '6-9', '9-12', '3-12'];

  return (
    <PageLayout title="Справочник навыков">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-gray-500">{areas.length} зон развития</span>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={importExcel} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
            {importing ? 'Импорт...' : '📊 Из Excel'}
          </button>
          <button onClick={() => setShowAreaForm(true)} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700">
            + Зона
          </button>
        </div>
      </div>

      {/* Подсказка для Excel */}
      <div className="text-xs text-gray-400 mb-4 bg-gray-50 p-2 rounded">
        Excel формат: колонки <b>Зона</b>, <b>Группа</b>, <b>Навык</b>, <b>Описание</b> (опц.), <b>Возраст</b> (опц., напр. 3-6)
      </div>

      {/* New Area Form */}
      {showAreaForm && (
        <form onSubmit={createArea} className="bg-white border rounded-xl p-4 mb-4 space-y-3">
          <h3 className="font-medium">Новая зона развития</h3>
          <div className="grid grid-cols-3 gap-3">
            <input value={areaForm.title} onChange={e => setAreaForm(p => ({...p, title: e.target.value}))} placeholder="Название зоны" className="w-full border rounded px-3 py-2 col-span-2" required />
            <div className="flex gap-2">
              <input value={areaForm.icon} onChange={e => setAreaForm(p => ({...p, icon: e.target.value}))} placeholder="Иконка" className="w-16 border rounded px-2 py-2 text-center" />
              <input type="color" value={areaForm.color} onChange={e => setAreaForm(p => ({...p, color: e.target.value}))} className="w-12 h-10 border rounded cursor-pointer" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">Создать</button>
            <button type="button" onClick={() => setShowAreaForm(false)} className="text-gray-500 px-4 py-2 text-sm">Отмена</button>
          </div>
        </form>
      )}

      {/* Skill Edit Form (modal-like) */}
      {editingSkill && (
        <form onSubmit={updateSkill} className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-4 space-y-3">
          <h3 className="font-medium">Редактировать навык</h3>
          <input value={skillForm.title} onChange={e => setSkillForm(p => ({...p, title: e.target.value}))} placeholder="Название навыка" className="w-full border rounded px-3 py-2" required />
          <div className="grid grid-cols-2 gap-3">
            <textarea value={skillForm.description || ''} onChange={e => setSkillForm(p => ({...p, description: e.target.value}))} placeholder="Описание и развиваемые навыки" className="w-full border rounded px-3 py-2 h-20 whitespace-pre-wrap" />
            <select value={skillForm.ageRange} onChange={e => setSkillForm(p => ({...p, ageRange: e.target.value}))} className="w-full border rounded px-3 py-2">
              <option value="">Возраст не указан</option>
              {AGE_OPTIONS.map(a => <option key={a} value={a}>{a} лет</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm">Сохранить</button>
            <button type="button" onClick={() => setEditingSkill(null)} className="text-gray-500 px-4 py-2 text-sm">Отмена</button>
          </div>
        </form>
      )}

      {/* Areas List */}
      <div className="space-y-3">
        {areas.map(area => (
          <div key={area.id} className="bg-white border rounded-xl overflow-hidden">
            <button onClick={() => toggle(area.id)} className="w-full p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{area.icon}</span>
                <span className="font-semibold" style={{ color: area.color }}>{area.title}</span>
                <span className="text-sm text-gray-400">{area.groups?.length || 0} групп</span>
              </div>
              <div className="flex items-center gap-2">
                <span onClick={(e) => { e.stopPropagation(); deleteArea(area.id); }} className="text-red-400 hover:text-red-600 cursor-pointer px-2 hover:scale-110 transition-transform" title="Удалить зону">🗑️</span>
                <span>{expanded.has(area.id) ? '▲' : '▼'}</span>
              </div>
            </button>

            {expanded.has(area.id) && (
              <div className="border-t">
                {area.groups?.map(group => (
                  <div key={group.id} className="border-b last:border-b-0">
                    <div onClick={() => toggleGroup(group.id)} className="cursor-pointer px-4 py-2 bg-gray-50 hover:bg-gray-100 font-medium text-sm text-gray-700 flex justify-between items-center transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-3">{expandedGroups.has(group.id) ? '▼' : '▶'}</span>
                        <span>{group.title}</span>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={(e) => { e.stopPropagation(); setExpandedGroups(p => new Set(p).add(group.id)); setShowSkillForm(group.id); setSkillForm({ title: '', description: '', ageRange: '', groupId: group.id }); }} className="text-indigo-500 hover:text-indigo-700 hover:scale-110 transition-transform" title="Добавить навык">➕</button>
                        <button onClick={(e) => { e.stopPropagation(); deleteSG(group.id); }} className="text-red-400 hover:text-red-600 hover:scale-110 transition-transform" title="Удалить группу">🗑️</button>
                      </div>
                    </div>

                    {expandedGroups.has(group.id) && (
                      <div className="bg-white">
                        {/* New Skill Form (inline) */}
                        {showSkillForm === group.id && (
                          <form onSubmit={createSkill} className="px-4 py-3 bg-indigo-50 space-y-2 border-b border-indigo-100">
                            <div className="grid grid-cols-3 gap-2">
                              <input value={skillForm.title} onChange={e => setSkillForm(p => ({...p, title: e.target.value}))} placeholder="Название навыка" className="border rounded px-2 py-1.5 text-sm" required />
                              <textarea value={skillForm.description || ''} onChange={e => setSkillForm(p => ({...p, description: e.target.value}))} placeholder="Описание" className="border rounded px-2 py-1.5 text-sm h-10 whitespace-pre-wrap" />
                              <select value={skillForm.ageRange} onChange={e => setSkillForm(p => ({...p, ageRange: e.target.value}))} className="border rounded px-2 py-1.5 text-sm">
                                <option value="">Возраст</option>
                                {AGE_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button type="submit" className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700">Добавить</button>
                              <button type="button" onClick={() => setShowSkillForm('')} className="text-gray-500 text-sm hover:text-gray-700">Отмена</button>
                            </div>
                          </form>
                        )}

                        <div className="space-y-0">
                          {/* Заголовок колонок */}
                          {(group.skills && group.skills.length > 0) && (
                            <div className="grid grid-cols-12 gap-3 px-4 py-2 text-xs font-semibold text-gray-500 border-b bg-gray-50 -mx-4">
                              <div className="col-span-3">Упражнение (Навык)</div>
                              <div className="col-span-4">Описание</div>
                              <div className="col-span-3">Развиваемые навыки</div>
                              <div className="col-span-1 text-center">Возраст</div>
                              <div className="col-span-1 text-right">Действия</div>
                            </div>
                          )}

                          {group.skills?.map(skill => {
                            const p = skill.description ? skill.description.split('Развиваемые навыки:') : [];
                            const descText = p[0] ? p[0].trim() : '';
                            const devText = p.length > 1 ? p[1].trim() : '';

                            return (
                              <div key={skill.id} className="grid grid-cols-12 gap-3 py-3 text-sm group/skill border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-4 px-4 items-start">
                                <div className="col-span-3 font-medium text-gray-800 pr-2">{skill.title}</div>
                                <div className="col-span-4 text-xs text-gray-600 pr-2 whitespace-pre-wrap">{descText || <span className="text-gray-300 italic">Нет описания</span>}</div>
                                <div className="col-span-3 text-xs text-gray-600 pr-2 whitespace-pre-wrap">{devText || <span className="text-gray-300 italic">—</span>}</div>
                                <div className="col-span-1 flex justify-center mt-0.5">
                                  {skill.ageRange ? <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">{skill.ageRange} лет</span> : <span className="text-gray-300 italic">—</span>}
                                </div>
                                <div className="col-span-1 flex justify-end gap-3 mt-0.5 opacity-0 group-hover/skill:opacity-100 transition-opacity">
                                  <button onClick={() => startEditSkill(skill)} className="hover:scale-110 transition-transform" title="Редактировать">✏️</button>
                                  <button onClick={() => deleteSkill(skill.id)} className="hover:scale-110 transition-transform" title="Удалить">🗑️</button>
                                </div>
                              </div>
                            );
                          })}
                          {(!group.skills || group.skills.length === 0) && (
                            <div className="px-4 py-4 text-xs text-gray-400 italic text-center -mx-4">Нет добавленных навыков</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* New SkillGroup Form */}
                {showSGForm === area.id ? (
                  <form onSubmit={createSG} className="px-4 py-3 bg-green-50 flex gap-2 items-center">
                    <input value={sgForm.title} onChange={e => setSGForm({ title: e.target.value })} placeholder="Название группы навыков" className="flex-1 border rounded px-3 py-1.5 text-sm" required />
                    <button type="submit" className="bg-green-600 text-white px-3 py-1.5 rounded text-sm">Добавить</button>
                    <button type="button" onClick={() => setShowSGForm('')} className="text-gray-500 text-sm">Отмена</button>
                  </form>
                ) : (
                  <button onClick={() => setShowSGForm(area.id)} className="w-full px-4 py-2 text-sm text-green-600 hover:bg-green-50 text-left">
                    + Добавить группу навыков
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
