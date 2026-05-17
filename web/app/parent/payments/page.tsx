'use client';
import { useEffect, useMemo, useState } from 'react';
import { CreditCard, CalendarDays } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button, Badge, SectionLabel } from '@/components/ui';
import api from '@/lib/api';
import { Child } from '@/lib/types';

interface Payment {
  id: string;
  month: string;
  amount: number;
  paid: number;
  status: 'paid' | 'pending' | 'overdue';
}

const STATUS_TONE: Record<Payment['status'], 'success' | 'warn' | 'danger'> = {
  paid: 'success',
  pending: 'warn',
  overdue: 'danger',
};

const STATUS_LABEL: Record<Payment['status'], string> = {
  paid: 'оплачено',
  pending: 'ожидает',
  overdue: 'просрочено',
};

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

function formatMonth(iso: string): string {
  const d = new Date(iso);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function shortInvoiceId(id: string): string {
  // Last 5 hex chars from uuid — stable, recognisable as invoice number
  return `#${id.replace(/-/g, '').slice(-5)}`;
}

/** Кол-во рабочих дней (Пн-Пт) в месяце. */
function workingDaysInMonth(year: number, month: number): number {
  const last = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= last; d++) {
    const day = new Date(year, month, d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/** Рабочих дней до сегодня включительно. */
function workingDaysElapsed(year: number, month: number, today: Date): number {
  const inSameMonth = today.getFullYear() === year && today.getMonth() === month;
  const lastDay = inSameMonth
    ? today.getDate()
    : today > new Date(year, month, 1)
      ? new Date(year, month + 1, 0).getDate()
      : 0;
  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    const day = new Date(year, month, d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export default function PaymentsPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data[0]) setChildId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!childId) return;
    api.get(`/children/${childId}/payments`).then(r => setPayments(r.data));
  }, [childId]);

  const sorted = useMemo(
    () => [...payments].sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime()),
    [payments],
  );

  const dueNext = useMemo(() => {
    const pending = payments.filter(p => p.status !== 'paid');
    pending.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
    return pending[0];
  }, [payments]);

  const dueLabel = dueNext ? formatMonth(dueNext.month).toLowerCase() : '';

  /** Накоплено по тарифу за месяц на сегодня (по рабочим дням). */
  const monthlyAccrual = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const currentInvoice = payments.find(p => {
      const d = new Date(p.month);
      return d.getFullYear() === y && d.getMonth() === m;
    });
    const monthly = currentInvoice
      ? Number(currentInvoice.amount)
      : payments.length
        ? Number(payments[0].amount)
        : 0;
    if (!monthly) return null;
    const total = workingDaysInMonth(y, m);
    const elapsed = workingDaysElapsed(y, m, today);
    if (total === 0) return null;
    const perDay = monthly / total;
    return {
      monthly,
      perDay: Math.round(perDay),
      elapsed,
      total,
      accrued: Math.round(perDay * elapsed),
      label: formatMonth(new Date(y, m, 1).toISOString()),
    };
  }, [payments]);

  return (
    <PageLayout
      eyebrow="Счета и история"
      title="Оплата"
      actions={
        dueNext && (
          <Button variant="primary" size="sm">
            <CreditCard size={16} />
            Оплатить {dueLabel.split(' ')[0]}
          </Button>
        )
      }
    >
      {children.length > 1 && (
        <div className="mb-4">
          <select
            value={childId}
            onChange={e => setChildId(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* History */}
        <Card padding="none" className="overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <SectionLabel>Счета</SectionLabel>
            <h3 className="font-serif text-2xl mt-1">История платежей</h3>
          </div>
          {sorted.length === 0 ? (
            <div className="text-sm text-slate-400 py-12 text-center">
              Платежей пока нет
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/40">
                    <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-6 py-3">
                      Период
                    </th>
                    <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-6 py-3">
                      Сумма
                    </th>
                    <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-6 py-3">
                      Статус
                    </th>
                    <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-6 py-3">
                      Дата
                    </th>
                    <th className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-500 px-6 py-3">
                      Счёт
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.map(p => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 font-medium">{formatMonth(p.month)}</td>
                      <td className="px-6 py-4 tabular-nums text-sm">
                        {Number(p.amount).toLocaleString('ru-RU')} ₽
                      </td>
                      <td className="px-6 py-4">
                        <Badge tone={STATUS_TONE[p.status]} dot>
                          {STATUS_LABEL[p.status]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {p.status === 'paid'
                          ? formatShortDate(p.month)
                          : `до ${formatShortDate(p.month)}`}
                      </td>
                      <td className="px-6 py-4 tabular-nums text-xs text-slate-400">
                        {p.status === 'paid' ? shortInvoiceId(p.id) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Pay card + requisites */}
        <div className="space-y-4">
          {monthlyAccrual && (
            <Card padding="md">
              <div className="flex items-center gap-2 mb-2 text-brand">
                <CalendarDays size={16} />
                <SectionLabel>Накоплено за месяц</SectionLabel>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-3xl">
                  {monthlyAccrual.accrued.toLocaleString('ru-RU')}
                </span>
                <span className="text-base text-slate-500">₽</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {monthlyAccrual.label} · {monthlyAccrual.elapsed} из {monthlyAccrual.total} рабочих дней
              </div>
              <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((monthlyAccrual.accrued / monthlyAccrual.monthly) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
                <span>≈ {monthlyAccrual.perDay.toLocaleString('ru-RU')} ₽ / день</span>
                <span>из {monthlyAccrual.monthly.toLocaleString('ru-RU')} ₽</span>
              </div>
            </Card>
          )}
          {dueNext && (
            <Card padding="md" variant="pale">
              <SectionLabel>К оплате</SectionLabel>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-serif text-4xl">
                  {Number(dueNext.amount).toLocaleString('ru-RU')}
                </span>
                <span className="text-lg text-slate-500">₽</span>
              </div>
              <div className="text-sm text-slate-600 mt-1 mb-4">
                {formatMonth(dueNext.month)} · срок до {formatShortDate(dueNext.month)}
              </div>
              <Button variant="primary" className="w-full">
                <CreditCard size={16} />
                Оплатить картой
              </Button>
            </Card>
          )}
          <Card padding="md">
            <SectionLabel>Реквизиты</SectionLabel>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Получатель</dt>
                <dd className="text-foreground">ООО «GloboAtlas»</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">ИНН</dt>
                <dd className="tabular-nums text-foreground">7723123456</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Счёт</dt>
                <dd className="tabular-nums text-foreground">40702 810 …</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
