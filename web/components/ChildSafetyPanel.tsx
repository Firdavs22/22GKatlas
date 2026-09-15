'use client';

import { useState } from 'react';
import { Card, Button, SectionLabel } from '@/components/ui';
import api from '@/lib/api';

export interface ChildSafety {
  forbiddenFoods?: string | null;
  contactEmail?: string | null;
  socialPublicationStatus?: string;
  socialPublicationComment?: string | null;
  safetyRevision?: number;
}

const labels: Record<string, string> = { unknown: 'Не уточнено', allowed: 'Разрешено', forbidden: 'Запрещено' };
const input = 'w-full rounded-xl border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30';

export default function ChildSafetyPanel({ child, childId, onSaved }: {
  child: ChildSafety; childId?: string; onSaved?: (child: ChildSafety) => void;
}) {
  const [draft, setDraft] = useState<ChildSafety | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const value = draft || child;
  const status = value.socialPublicationStatus || 'unknown';
  const forbidden = status === 'forbidden';

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft || !childId) return;
    setBusy(true); setError('');
    try {
      const { data } = await api.patch(`/admin/children/${childId}/safety`, {
        safetyRevision: draft.safetyRevision ?? 0,
        forbiddenFoods: draft.forbiddenFoods?.trim() || '',
        contactEmail: draft.contactEmail?.trim() || '',
        socialPublicationStatus: draft.socialPublicationStatus || 'unknown',
        socialPublicationComment: draft.socialPublicationComment?.trim() || '',
      });
      onSaved?.(data); setDraft(null);
    } catch (e: unknown) {
      const message = (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      setError(Array.isArray(message) ? message.join('. ') : message || 'Не удалось сохранить');
    } finally { setBusy(false); }
  };

  return <Card padding="md" className="mb-6">
    <form onSubmit={save}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <SectionLabel>Питание, почта и публикации</SectionLabel>
        {childId && !draft && <Button type="button" size="sm" variant="outline" onClick={() => { setError(''); setDraft({ ...child }); }}>Редактировать</Button>}
      </div>
      <fieldset disabled={busy} className="space-y-4">
        <div className={`rounded-xl border p-3 ${value.forbiddenFoods?.trim() ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-100'}`}>
          <label className="block text-sm font-medium mb-2" htmlFor={draft ? 'forbidden-foods' : undefined}>Запрещенные продукты</label>
          {draft ? <textarea id="forbidden-foods" className={input} rows={3} maxLength={4000} value={value.forbiddenFoods || ''} onChange={e => setDraft({ ...draft, forbiddenFoods: e.target.value })} />
            : <p className="text-sm whitespace-pre-wrap">{value.forbiddenFoods || 'Не указаны'}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-2" htmlFor={draft ? 'child-contact-email' : undefined}>Почта для связи</label>
          {draft ? <><input id="child-contact-email" className={input} type="email" maxLength={254} value={value.contactEmail || ''} onChange={e => setDraft({ ...draft, contactEmail: e.target.value })} />
            <p className="text-xs text-slate-500 mt-1">Почта для переписки по ребенку. Доступ в кабинет настраивается в разделе «Родители».</p></>
            : <p className="text-sm break-words">{value.contactEmail || 'Не указана'}</p>}
        </div>
        <div className={`rounded-xl border p-3 ${forbidden ? 'border-red-300 bg-red-50 text-red-900' : status === 'allowed' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <label className="block text-sm font-medium mb-2" htmlFor={draft ? 'social-publication' : undefined}>Разрешение на публикацию в социальных сетях</label>
          {draft ? <select id="social-publication" className={input} value={status} onChange={e => setDraft({ ...draft, socialPublicationStatus: e.target.value })}>
            {Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select> : <p className="text-sm font-semibold">{labels[status] || labels.unknown}</p>}
          {status === 'unknown' && <p className="text-xs mt-2">Разрешение пока не подтверждено.</p>}
          <label className="block text-sm font-medium mt-3 mb-2" htmlFor={draft ? 'publication-comment' : undefined}>Комментарий к разрешению</label>
          {draft ? <textarea id="publication-comment" className={input} rows={3} maxLength={4000} placeholder="Ограничения, дата и основание согласия" value={value.socialPublicationComment || ''} onChange={e => setDraft({ ...draft, socialPublicationComment: e.target.value })} />
            : <p className="text-sm whitespace-pre-wrap">{value.socialPublicationComment || 'Не указан'}</p>}
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-700 mt-3">{error}</p>}
      {draft && <div className="flex gap-2 mt-4">
        <Button type="submit" disabled={busy}>{busy ? 'Сохранение…' : 'Сохранить'}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => { setDraft(null); setError(''); }}>Отмена</Button>
      </div>}
    </form>
  </Card>;
}
