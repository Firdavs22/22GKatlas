'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
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
  sickDiscount: number;     // sickDays * 400
  vacationDiscount: number; // vacationDays * (monthlyFee * 0.5 / workDays)
  finalAmount: number;
  paid: number;
  paymentId?: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  debt: 'bg-red-100 text-red-800'
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает оплаты',
  paid: 'Оплачено',
  debt: 'Долг'
};

const MONTH_NAMES = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];

export default function AdminPayments() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [rows, setRows] = useState<ChildPaymentRow[]>([]);

  const [filterGroup, setFilterGroup] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ childId: '', amount: 0, paid: 0, status: 'pending' });

  // History modal
  const [historyChildId, setHistoryChildId] = useState<string | null>(null);
  const [historyChildName, setHistoryChildName] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/admin/groups'),
      api.get('/admin/children'),
      api.get('/admin/payments'),
    ]).then(([grpRes, chRes, payRes]) => {
      setGroups(grpRes.data);
      setChildren(chRes.data);
      setPayments(payRes.data);
    });
  }, []);

  // Recalculate when month, children, groups, or payments change
  useEffect(() => {
    if (!children.length || !groups.length) return;

    // Get month start/end
    const [y, m] = month.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0);

    // Count working days (Mon-Fri) in month
    let workDays = 0;
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) workDays++;
    }

    // Load attendance for this month
    // We'll compute from existing attendance data
    api.get('/admin/attendance').then(attRes => {
      const attData = attRes.data || [];

      const computedRows: ChildPaymentRow[] = [];

      for (const child of children.filter((c: any) => c.status === 'active' && c.groupId)) {
        const group = groups.find(g => g.id === child.groupId);
        if (!group) continue;

        const fee = group.monthlyFee || 75000;

        // Filter attendance for this child in this month
        const childAtt = attData.filter((a: any) => {
          if (a.childId !== child.id) return false;
          const d = new Date(a.date);
          return d.getFullYear() === y && d.getMonth() === m - 1;
        });

        const sickDays = childAtt.filter((a: any) => a.status === 'sick').length;
        const vacationDays = childAtt.filter((a: any) => a.status === 'vacation').length;
        const absentDays = childAtt.filter((a: any) => a.status === 'absent').length;
        const presentDays = childAtt.filter((a: any) => a.status === 'present').length;

        // Discounts:
        // Sick: -400₽ per day
        const sickDiscount = sickDays * 400;
        // Vacation: -50% of daily rate per day
        const dailyRate = workDays > 0 ? fee / workDays : 0;
        const vacationDiscount = Math.round(vacationDays * dailyRate * 0.5);
        // Absent: no discount

        const finalAmount = Math.max(0, fee - sickDiscount - vacationDiscount);

        // Find existing payment for this child/month
        const existingPayment = payments.find(p =>
          p.childId === child.id &&
          new Date(p.month).getFullYear() === y &&
          new Date(p.month).getMonth() === m - 1
        );

        computedRows.push({
          childId: child.id,
          childName: child.name,
          groupName: group.name,
          groupId: group.id,
          monthlyFee: fee,
          sickDays,
          vacationDays,
          absentDays,
          presentDays,
          sickDiscount,
          vacationDiscount,
          finalAmount,
          paid: existingPayment?.paid || 0,
          paymentId: existingPayment?.id,
          status: existingPayment?.status || 'pending',
        });
      }

      computedRows.sort((a, b) => a.groupName.localeCompare(b.groupName) || a.childName.localeCompare(b.childName));
      setRows(computedRows);
    });
  }, [month, children, groups, payments]);

  const updatePaid = async (row: ChildPaymentRow, newPaid: number) => {
    setSaving(true);
    try {
      if (row.paymentId) {
        await api.put(`/admin/payments/${row.paymentId}`, { paid: newPaid, amount: row.finalAmount });
      } else {
        await api.post('/admin/payments', { childId: row.childId, month: month + '-01', amount: row.finalAmount, paid: newPaid, status: newPaid >= row.finalAmount ? 'paid' : 'pending' });
      }
      api.get('/admin/payments').then(r => setPayments(r.data));
    } catch { alert('Ошибка'); }
    finally { setSaving(false); }
  };

  const updateStatus = async (row: ChildPaymentRow, newStatus: string) => {
    try {
      if (row.paymentId) {
        await api.put(`/admin/payments/${row.paymentId}`, { status: newStatus });
      } else {
        await api.post('/admin/payments', { childId: row.childId, month: month + '-01', amount: row.finalAmount, paid: 0, status: newStatus });
      }
      api.get('/admin/payments').then(r => setPayments(r.data));
    } catch { alert('Ошибка'); }
  };

  const filtered = rows.filter(r => {
    if (filterGroup !== 'all' && r.groupId !== filterGroup) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  const totalFinalAmount = filtered.reduce((s, r) => s + r.finalAmount, 0);

  // Month label
  const [mYear, mMonth] = month.split('-').map(Number);
  const monthLabel = `${MONTH_NAMES[mMonth - 1]} ${mYear}`;

  // Group summary
  const groupSummary = groups.map(g => {
    const gRows = rows.filter(r => r.groupId === g.id);
    return {
      group: g,
      count: gRows.length,
      totalFee: gRows.reduce((s, r) => s + r.finalAmount, 0),
      totalPaid: gRows.reduce((s, r) => s + r.paid, 0),
    };
  }).filter(gs => gs.count > 0);

  return (
    <PageLayout title="Учёт оплаты">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase">К оплате за {monthLabel}</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalFinalAmount.toLocaleString()} ₽</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500 uppercase">Детей</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{filtered.length}</div>
        </div>
      </div>

      {/* Group cards */}
      {groupSummary.length > 0 && (
        <div className="bg-white border rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">По группам</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {groupSummary.map(gs => (
              <button key={gs.group.id}
                onClick={() => setFilterGroup(filterGroup === gs.group.id ? 'all' : gs.group.id)}
                className={`text-left p-3 rounded-lg border transition-all ${filterGroup === gs.group.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'hover:bg-gray-50'}`}
              >
                <div className="font-medium text-sm">{gs.group.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  К оплате: {gs.totalFee.toLocaleString()} ₽
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Месяц</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Группа</label>
          <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="all">Все</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="all">Все</option>
            <option value="pending">Ожидает оплаты</option>
            <option value="paid">Оплачено</option>
            <option value="debt">Долг</option>
          </select>
        </div>
      </div>

      {/* Info box about calculation rules */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-xs text-blue-700">
        <strong>Правила расчёта:</strong> Базовая стоимость — из группы. Болезнь 🤒: <strong>−400 ₽/день</strong>. Отпуск 🏖️: <strong>−50% дневной стоимости</strong>. Пропуск ❌: без скидки.
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ребёнок</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Группа</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Абонемент</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">🤒 Болезнь</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">🏖️ Отпуск</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Скидка</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase font-bold">К оплате</th>
              <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Нет данных. Убедитесь, что дети зачислены в группы.</td></tr>
            ) : filtered.map(r => {
              const debt = r.finalAmount - r.paid;
              const totalDiscount = r.sickDiscount + r.vacationDiscount;
              return (
                <tr key={r.childId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">
                    <button
                      onClick={() => { setHistoryChildId(r.childId); setHistoryChildName(r.childName); }}
                      className="text-indigo-600 hover:underline font-medium text-left"
                    >
                      {r.childName}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">{r.groupName}</td>
                  <td className="px-3 py-3 text-center text-sm">{r.monthlyFee.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center text-xs">
                    {r.sickDays > 0 ? (
                      <span className="text-orange-600">{r.sickDays} дн. (−{r.sickDiscount.toLocaleString()})</span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center text-xs">
                    {r.vacationDays > 0 ? (
                      <span className="text-blue-600">{r.vacationDays} дн. (−{r.vacationDiscount.toLocaleString()})</span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center text-xs">
                    {totalDiscount > 0 ? <span className="text-green-600 font-medium">−{totalDiscount.toLocaleString()}</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center text-sm font-bold">{r.finalAmount.toLocaleString()} ₽</td>
                  <td className="px-3 py-3 text-center">
                    <select
                      value={r.status}
                      onChange={e => updateStatus(r, e.target.value)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium appearance-none cursor-pointer outline-none border-0 ${STATUS_COLORS[r.status] || ''}`}
                    >
                      <option value="pending">Ожидает оплаты</option>
                      <option value="paid">Оплачено</option>
                      <option value="debt">Долг</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Payment History Modal */}
      {historyChildId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setHistoryChildId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">История оплат</h2>
                  <div className="text-indigo-200 mt-1">{historyChildName}</div>
                </div>
                <button onClick={() => setHistoryChildId(null)} className="text-white/70 hover:text-white text-2xl">✕</button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Месяц</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Начислено</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Оплачено</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Баланс</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments
                    .filter(p => p.childId === historyChildId)
                    .sort((a: any, b: any) => new Date(b.month).getTime() - new Date(a.month).getTime())
                    .map((p: any) => {
                      const balance = p.amount - p.paid;
                      return (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">
                            {new Date(p.month).toLocaleDateString('ru', { year: 'numeric', month: 'long' })}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">{p.amount.toLocaleString()} ₽</td>
                          <td className="px-4 py-3 text-center text-sm text-green-600">{p.paid.toLocaleString()} ₽</td>
                          <td className="px-4 py-3 text-center text-sm font-medium">
                            <span className={balance > 0 ? 'text-red-600' : 'text-green-600'}>
                              {balance > 0 ? `−${balance.toLocaleString()}` : '0'} ₽
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[p.status] || ''}`}>
                              {p.status === 'paid' ? 'Оплачено' : p.status === 'overdue' ? 'Просрочено' : 'Ожидает'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  {payments.filter(p => p.childId === historyChildId).length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Нет сохранённых платежей</td></tr>
                  )}
                </tbody>
              </table>
              {(() => {
                const childPayments = payments.filter(p => p.childId === historyChildId);
                if (childPayments.length === 0) return null;
                const totalCharged = childPayments.reduce((s: number, p: any) => s + p.amount, 0);
                const totalPaidHist = childPayments.reduce((s: number, p: any) => s + p.paid, 0);
                return (
                  <div className="bg-gray-50 px-4 py-3 border-t flex justify-between text-sm">
                    <span className="text-gray-500">Всего начислено: <strong>{totalCharged.toLocaleString()} ₽</strong></span>
                    <span className="text-gray-500">Оплачено: <strong className="text-green-600">{totalPaidHist.toLocaleString()} ₽</strong></span>
                    <span className="text-gray-500">Баланс: <strong className={totalCharged - totalPaidHist > 0 ? 'text-red-600' : 'text-green-600'}>{(totalCharged - totalPaidHist).toLocaleString()} ₽</strong></span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
