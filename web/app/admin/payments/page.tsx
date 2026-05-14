'use client';
import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';

interface Group { id: string; name: string; monthlyFee?: number; capacity?: number; }

interface ChildPaymentRow {
  childId: string;
  childName: string;
  groupName: string;
  groupId: string;
  monthlyFee: number;
  sickDays: number;
  vacationDays: number;
  absentDays: number;
  presentDays: number;
  sickDiscount: number;
  vacationDiscount: number;
  finalAmount: number;
  paid: number;
  paymentId?: string;
  status: 'pending' | 'paid' | 'debt' | 'overdue';
}

const STATUS_BG: Record<string, string> = {
  pending: 'bg-warn/30 text-orange-900',
  paid: 'bg-success/30 text-emerald-900',
  debt: 'bg-danger/30 text-red-900',
  overdue: 'bg-danger/30 text-red-900',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Ожидает',
  paid: 'Оплачено',
  debt: 'Долг',
  overdue: 'Просрочено',
};

const MONTH_NAMES = [
  'Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
  'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря',
];

const inputCls =
  'h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

interface ChildRow {
  id: string;
  name: string;
  status: string;
  groupId?: string;
}

interface PaymentRow {
  id: string;
  childId: string;
  month: string;
  amount: number;
  paid: number;
  status: 'paid' | 'pending' | 'debt' | 'overdue';
}

export default function AdminPayments() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [rows, setRows] = useState<ChildPaymentRow[]>([]);

  const [filterGroup, setFilterGroup] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const [historyChildId, setHistoryChildId] = useState<string | null>(null);
  const [historyChildName, setHistoryChildName] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/admin/groups'),
      api.get('/admin/children'),
      api.get('/admin/payments'),
    ]).then(([g, c, p]) => {
      setGroups(g.data);
      setChildren(c.data);
      setPayments(p.data);
    });
  }, []);

  useEffect(() => {
    if (!children.length || !groups.length) return;
    const [y, m] = month.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0);

    let workDays = 0;
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) workDays++;
    }

    api.get('/admin/attendance').then(attRes => {
      const att = (attRes.data || []) as { childId: string; date: string; status: string }[];
      const out: ChildPaymentRow[] = [];

      for (const child of children.filter(c => c.status === 'active' && c.groupId)) {
        const group = groups.find(g => g.id === child.groupId);
        if (!group) continue;
        const fee = group.monthlyFee || 75000;

        const childAtt = att.filter(a => {
          if (a.childId !== child.id) return false;
          const d = new Date(a.date);
          return d.getFullYear() === y && d.getMonth() === m - 1;
        });

        const sickDays = childAtt.filter(a => a.status === 'sick').length;
        const vacationDays = childAtt.filter(a => a.status === 'vacation').length;
        const absentDays = childAtt.filter(a => a.status === 'absent').length;
        const presentDays = childAtt.filter(a => a.status === 'present').length;

        const sickDiscount = sickDays * 400;
        const dailyRate = workDays > 0 ? fee / workDays : 0;
        const vacationDiscount = Math.round(vacationDays * dailyRate * 0.5);
        const finalAmount = Math.max(0, fee - sickDiscount - vacationDiscount);

        const existing = payments.find(
          p =>
            p.childId === child.id &&
            new Date(p.month).getFullYear() === y &&
            new Date(p.month).getMonth() === m - 1,
        );

        out.push({
          childId: child.id,
          childName: child.name,
          groupName: group.name,
          groupId: group.id,
          monthlyFee: fee,
          sickDays, vacationDays, absentDays, presentDays,
          sickDiscount, vacationDiscount, finalAmount,
          paid: existing?.paid || 0,
          paymentId: existing?.id,
          status: existing?.status || 'pending',
        });
      }
      out.sort((a, b) => a.groupName.localeCompare(b.groupName) || a.childName.localeCompare(b.childName));
      setRows(out);
    });
  }, [month, children, groups, payments]);

  const updateStatus = async (row: ChildPaymentRow, newStatus: string) => {
    if (row.paymentId) {
      await api.put(`/admin/payments/${row.paymentId}`, { status: newStatus });
    } else {
      await api.post('/admin/payments', {
        childId: row.childId, month: month + '-01',
        amount: row.finalAmount, paid: 0, status: newStatus,
      });
    }
    api.get('/admin/payments').then(r => setPayments(r.data));
  };

  const filtered = rows.filter(r => {
    if (filterGroup !== 'all' && r.groupId !== filterGroup) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  const totalFinalAmount = filtered.reduce((s, r) => s + r.finalAmount, 0);
  const totalPaid = filtered.reduce((s, r) => s + r.paid, 0);
  const totalDebt = Math.max(0, totalFinalAmount - totalPaid);

  const [mYear, mMonth] = month.split('-').map(Number);
  const monthLabel = `${MONTH_NAMES[mMonth - 1]} ${mYear}`;

  const groupSummary = useMemo(
    () =>
      groups
        .map(g => {
          const gRows = rows.filter(r => r.groupId === g.id);
          return {
            group: g,
            count: gRows.length,
            totalFee: gRows.reduce((s, r) => s + r.finalAmount, 0),
          };
        })
        .filter(gs => gs.count > 0),
    [groups, rows],
  );

  return (
    <PageLayout
      eyebrow={`Период · ${monthLabel}`}
      title="Оплата"
      wide
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card padding="md">
          <SectionLabel>К оплате</SectionLabel>
          <div className="font-serif text-3xl mt-1">
            {totalFinalAmount.toLocaleString('ru-RU')} <span className="text-base text-slate-500">₽</span>
          </div>
        </Card>
        <Card padding="md">
          <SectionLabel>Получено</SectionLabel>
          <div className="font-serif text-3xl mt-1 text-emerald-700">
            {totalPaid.toLocaleString('ru-RU')} <span className="text-base text-slate-500">₽</span>
          </div>
        </Card>
        <Card padding="md">
          <SectionLabel>Долг</SectionLabel>
          <div className={`font-serif text-3xl mt-1 ${totalDebt > 0 ? 'text-red-700' : 'text-slate-400'}`}>
            {totalDebt.toLocaleString('ru-RU')} <span className="text-base text-slate-500">₽</span>
          </div>
        </Card>
      </div>

      {groupSummary.length > 0 && (
        <Card padding="md" className="mb-4">
          <SectionLabel>По группам</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {groupSummary.map(gs => {
              const active = filterGroup === gs.group.id;
              return (
                <button
                  key={gs.group.id}
                  onClick={() => setFilterGroup(active ? 'all' : gs.group.id)}
                  className={`text-left p-3 rounded-xl border transition-colors ${
                    active ? 'border-brand bg-brand-pale/30' : 'border-slate-100 hover:border-brand'
                  }`}
                >
                  <div className="font-medium text-sm">{gs.group.name}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {gs.totalFee.toLocaleString('ru-RU')} ₽
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card padding="md" className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Месяц
            </label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Группа
            </label>
            <select
              value={filterGroup}
              onChange={e => setFilterGroup(e.target.value)}
              className={inputCls}
            >
              <option value="all">Все</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Статус
            </label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className={inputCls}
            >
              <option value="all">Все</option>
              <option value="pending">Ожидает</option>
              <option value="paid">Оплачено</option>
              <option value="debt">Долг</option>
            </select>
          </div>
        </div>
      </Card>

      <Card padding="md" variant="pale" className="mb-4 text-xs text-slate-600">
        <strong className="text-foreground">Правила расчёта:</strong>
        {' '}Базовая стоимость — из группы. Болезнь: <strong>−400 ₽/день</strong>. Отпуск: <strong>−50% дневной стоимости</strong>. Пропуск: без скидки.
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/40">
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-4 py-3">Ребёнок</th>
                <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 py-3">Группа</th>
                <th className="text-right text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 py-3">Абонемент</th>
                <th className="text-center text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 py-3">Болезнь</th>
                <th className="text-center text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 py-3">Отпуск</th>
                <th className="text-right text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 py-3">Скидка</th>
                <th className="text-right text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 py-3">К оплате</th>
                <th className="text-center text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 py-3">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                    Нет данных. Убедитесь, что дети зачислены в группы.
                  </td>
                </tr>
              ) : (
                filtered.map(r => {
                  const totalDiscount = r.sickDiscount + r.vacationDiscount;
                  return (
                    <tr key={r.childId} className="hover:bg-slate-50/40">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setHistoryChildId(r.childId);
                            setHistoryChildName(r.childName);
                          }}
                          className="text-brand hover:underline font-medium text-sm text-left"
                        >
                          {r.childName}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">{r.groupName}</td>
                      <td className="px-3 py-3 text-right font-mono">{r.monthlyFee.toLocaleString('ru-RU')}</td>
                      <td className="px-3 py-3 text-center text-xs">
                        {r.sickDays > 0 ? (
                          <span className="text-red-700">
                            {r.sickDays}&nbsp;дн. <span className="text-slate-400">−{r.sickDiscount.toLocaleString('ru-RU')}</span>
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center text-xs">
                        {r.vacationDays > 0 ? (
                          <span className="text-orange-700">
                            {r.vacationDays}&nbsp;дн. <span className="text-slate-400">−{r.vacationDiscount.toLocaleString('ru-RU')}</span>
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-xs">
                        {totalDiscount > 0 ? (
                          <span className="text-emerald-700 font-medium">−{totalDiscount.toLocaleString('ru-RU')}</span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-semibold">
                        {r.finalAmount.toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="px-3 py-3 text-center">
                        <select
                          value={r.status}
                          onChange={e => updateStatus(r, e.target.value)}
                          className={`h-7 px-3 rounded-full text-xs font-medium appearance-none cursor-pointer border-0 outline-none focus:ring-2 focus:ring-brand/20 ${STATUS_BG[r.status] || 'bg-slate-100 text-slate-600'}`}
                        >
                          <option value="pending">Ожидает</option>
                          <option value="paid">Оплачено</option>
                          <option value="debt">Долг</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {historyChildId && (
        <div
          className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setHistoryChildId(null)}
        >
          <div
            className="bg-background rounded-3xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-brand text-white p-6 flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-brand-pale/80 mb-1">
                  История оплат
                </div>
                <h2 className="font-serif text-3xl">{historyChildName}</h2>
              </div>
              <button
                onClick={() => setHistoryChildId(null)}
                className="text-white/80 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50/40 border-b border-slate-100">
                  <tr>
                    <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-5 py-3">Месяц</th>
                    <th className="text-right text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 py-3">Начислено</th>
                    <th className="text-right text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 py-3">Оплачено</th>
                    <th className="text-right text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 py-3">Баланс</th>
                    <th className="text-center text-[11px] font-medium uppercase tracking-wider text-slate-500 px-3 py-3">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments
                    .filter(p => p.childId === historyChildId)
                    .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())
                    .map(p => {
                      const balance = p.amount - p.paid;
                      return (
                        <tr key={p.id}>
                          <td className="px-5 py-3 font-medium">
                            {new Date(p.month).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })}
                          </td>
                          <td className="px-3 py-3 text-right font-mono">{p.amount.toLocaleString('ru-RU')} ₽</td>
                          <td className="px-3 py-3 text-right font-mono text-emerald-700">{p.paid.toLocaleString('ru-RU')} ₽</td>
                          <td className="px-3 py-3 text-right font-mono">
                            <span className={balance > 0 ? 'text-red-700 font-medium' : 'text-emerald-700 font-medium'}>
                              {balance > 0 ? `−${balance.toLocaleString('ru-RU')}` : '0'} ₽
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Badge tone={p.status === 'paid' ? 'success' : p.status === 'overdue' ? 'danger' : 'warn'} dot>
                              {STATUS_LABEL[p.status] || p.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  {payments.filter(p => p.childId === historyChildId).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                        Нет сохранённых платежей
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
