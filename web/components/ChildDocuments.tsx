'use client';

import { useEffect, useState } from 'react';
import { FolderLock, FileText, Download, Upload } from 'lucide-react';
import { Card, Button, SectionLabel } from '@/components/ui';
import { downloadBlob } from '@/components/WorkUI';
import api from '@/lib/api';

type Document = { id: string; title: string; category: string; filename: string; originalName: string; size: number; uploadedAt: string; canRemove: boolean };
const categories: Record<string, string> = { contract: 'Договоры', medical: 'Медицинские документы', consent: 'Согласия', other: 'Прочее' };
const input = 'w-full rounded-xl border border-slate-200 p-3 text-sm';
const errorText = (e: unknown) => {
  const message = (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
  return Array.isArray(message) ? message.join('. ') : message || 'Не удалось выполнить действие. Повторите попытку.';
};

export default function ChildDocuments({ childId }: { childId: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [filter, setFilter] = useState('all');
  const [inputKey, setInputKey] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api.get(`/children/${childId}/documents`, { signal: controller.signal })
      .then(r => setDocs(r.data)).catch(e => { if (!controller.signal.aborted) setError(errorText(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [childId]);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError(''); setNotice('');
    if (file.size > 20 * 1024 * 1024) { setError('Максимальный размер файла — 20 МБ'); return; }
    setBusy(true);
    try {
      const body = new FormData(); body.append('file', file); body.append('title', title.trim()); body.append('category', category);
      const { data } = await api.post(`/children/${childId}/documents`, body);
      setDocs(prev => [data, ...prev]); setFile(null); setTitle(''); setInputKey(k => k + 1); setFilter('all'); setNotice('Документ загружен');
    } catch (err) { setError(errorText(err)); }
    finally { setBusy(false); }
  };

  const download = async (doc: Document) => {
    setBusy(true); setError('');
    try {
      const { data } = await api.get(`/files/${doc.filename}`, { responseType: 'blob' });
      await downloadBlob(data, doc.originalName || doc.filename);
    } catch { setError('Не удалось скачать документ. Проверьте доступ и повторите попытку.'); }
    finally { setBusy(false); }
  };

  const remove = async (doc: Document) => {
    if (!confirm(`Убрать «${doc.title}» из папки? Документ станет недоступен родителям.`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api.delete(`/children/${childId}/documents/${doc.id}`);
      setDocs(prev => prev.filter(d => d.id !== doc.id)); setNotice('Документ убран из папки');
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };

  return <Card padding="md" className="mb-6">
    <div className="flex items-center gap-2"><FolderLock size={20} className="text-brand" /><SectionLabel>Документы ребенка</SectionLabel></div>
    <p className="text-xs text-slate-500 mt-2 mb-4">Доступны администрации и родителям этого ребенка. Родитель может убрать только свои загрузки.</p>
    <form onSubmit={upload} className="rounded-xl bg-slate-50 p-4 mb-5">
      <fieldset disabled={busy || loading} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm">Название<input className={`${input} mt-1`} maxLength={200} placeholder="Например, согласие на публикацию" value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label className="text-sm">Раздел<select className={`${input} mt-1`} value={category} onChange={e => setCategory(e.target.value)}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-sm md:col-span-2">Файл<input key={inputKey} className="block w-full text-sm mt-2" type="file" required accept=".pdf,.doc,.docx,.xlsx,.jpg,.jpeg,.png,.webp" onChange={e => setFile(e.target.files?.[0] || null)} /></label>
        <p className="text-xs text-slate-500 md:col-span-2">PDF, Word, Excel или скан JPG / PNG / WEBP, до 20 МБ. Файл сохраняется в исходном качестве.</p>
        <Button type="submit" disabled={!file || busy || loading}><Upload size={15} />{busy ? 'Подождите…' : 'Загрузить документ'}</Button>
      </fieldset>
    </form>
    {error && <p role="alert" className="text-sm text-red-700 mb-3">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-700 mb-3">{notice}</p>}
    <div className="flex flex-wrap gap-2 mb-3">
      {Object.entries({ all: 'Все', ...categories }).map(([key, label]) => <button type="button" key={key} onClick={() => setFilter(key)} aria-pressed={filter === key} className={`rounded-full px-3 py-1.5 text-xs border ${filter === key ? 'bg-brand text-white border-brand' : 'border-slate-200'}`}>{label}</button>)}
    </div>
    {loading ? <p className="text-sm text-slate-500">Загрузка…</p> : !docs.filter(d => filter === 'all' || d.category === filter).length ? <p className="text-sm text-slate-500 py-4">В этом разделе пока нет документов.</p> :
      <ul className="divide-y divide-slate-100">{docs.filter(d => filter === 'all' || d.category === filter).map(doc => <li key={doc.id} className="flex flex-wrap items-center gap-3 py-4">
        <FileText size={20} className="text-brand shrink-0" />
        <div className="flex-1 min-w-0"><p className="font-medium text-sm break-words">{doc.title}</p><p className="text-xs text-slate-500 mt-1 break-words">{categories[doc.category] || 'Прочее'} · {new Date(doc.uploadedAt).toLocaleDateString('ru-RU')} · {(doc.size / 1024 / 1024).toFixed(2)} МБ</p></div>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => download(doc)}><Download size={14} />Скачать</Button>
        {doc.canRemove && <button type="button" disabled={busy} className="text-xs text-red-700 disabled:opacity-50" onClick={() => remove(doc)}>Убрать из папки</button>}
      </li>)}</ul>}
  </Card>;
}
