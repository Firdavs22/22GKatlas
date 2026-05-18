'use client';
import { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Filter as FilterIcon } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';

interface AuditRow {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  method: string;
  path: string;
  status: number;
  ip: string | null;
  userAgent: string | null;
  body: unknown;
  durationMs: number | null;
  createdAt: string;
  actor: { id: string; name: string; email: string | null } | null;
}

const METHODS = ['', 'POST', 'PUT', 'PATCH', 'DELETE'];

function methodColor(m: string): 'success' | 'brand' | 'warn' | 'danger' | 'neutral' {
  if (m === 'POST') return 'success';
  if (m === 'PUT' || m === 'PATCH') return 'brand';
  if (m === 'DELETE') return 'danger';
  return 'neutral';
}

function statusColor(s: number): 'success' | 'warn' | 'danger' | 'neutral' {
  if (s < 300) return 'success';
  if (s < 400) return 'neutral';
  if (s < 500) return 'warn';
  return 'danger';
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = { limit: '200' };
    if (method) params.method = method;
    if (search.trim()) params.path = search.trim();
    api.get('/admin/audit', { params })
      .then(r => setRows(r.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => rows, [rows]);

  return (
    <PageLayout
      eyebrow="Безопасность"
      title="Журнал действий"
      actions={
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Обновить
        </button>
      }
    >
      <Card padding="md" className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Поиск по пути
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && load()}
                placeholder="/admin/staff, /children, …"
                className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Метод
            </label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              {METHODS.map(m => <option key={m} value={m}>{m || 'Все'}</option>)}
            </select>
          </div>
          <button
            onClick={load}
            className="h-10 px-4 rounded-xl bg-brand text-white text-sm font-medium hover:bg-brand-soft inline-flex items-center gap-2"
          >
            <FilterIcon size={14} /> Применить
          </button>
        </div>
      </Card>

      {loading ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-8 text-center">Загрузка…</div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="md">
          <div className="text-sm text-slate-400 py-8 text-center">Записей нет</div>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/40 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                  <th className="text-left px-4 py-3">Время</th>
                  <th className="text-left px-2 py-3">Кто</th>
                  <th className="text-left px-2 py-3">Метод</th>
                  <th className="text-left px-2 py-3">Путь</th>
                  <th className="text-left px-2 py-3">Статус</th>
                  <th className="text-left px-2 py-3">IP</th>
                  <th className="text-right px-4 py-3">мс</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(r => {
                  const expanded = openId === r.id;
                  return (
                    <>
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/40 cursor-pointer"
                        onClick={() => setOpenId(expanded ? null : r.id)}
                      >
                        <td className="px-4 py-2 text-xs tabular-nums whitespace-nowrap text-slate-600">
                          {formatDateTime(r.createdAt)}
                        </td>
                        <td className="px-2 py-2">
                          {r.actor ? (
                            <>
                              <div className="font-medium text-xs">{r.actor.name}</div>
                              <div className="text-[10px] text-slate-500">
                                {r.actorRole}
                              </div>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">аноним</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <Badge tone={methodColor(r.method)}>{r.method}</Badge>
                        </td>
                        <td className="px-2 py-2 text-xs font-mono text-slate-700 max-w-[300px] truncate">
                          {r.path}
                        </td>
                        <td className="px-2 py-2">
                          <Badge tone={statusColor(r.status)}>{r.status}</Badge>
                        </td>
                        <td className="px-2 py-2 text-xs tabular-nums text-slate-500 whitespace-nowrap">
                          {r.ip || '—'}
                        </td>
                        <td className="px-4 py-2 text-xs tabular-nums text-right text-slate-500">
                          {r.durationMs ?? '—'}
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div>
                                <SectionLabel>Тело запроса</SectionLabel>
                                <pre className="mt-1 rounded-lg bg-white p-2 border border-slate-100 overflow-x-auto text-[11px] leading-relaxed">
{JSON.stringify(r.body, null, 2) || '—'}
                                </pre>
                              </div>
                              <div>
                                <SectionLabel>User-Agent</SectionLabel>
                                <div className="mt-1 text-[11px] text-slate-600 break-all">
                                  {r.userAgent || '—'}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageLayout>
  );
}
