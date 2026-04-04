'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Child } from '@/lib/types';

interface Payment { id: string; month: string; status: string; amount: number; paid: number; }
interface Attendance { id: string; date: string; status: string; }

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  debt: 'bg-red-100 text-red-800',
  overdue: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает оплаты',
  paid: 'Оплачено',
  debt: 'Долг',
  overdue: 'Долг',
};

const MONTH_NAMES_GEN = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];

export default function ParentPayments() {
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);

  useEffect(() => {
    api.get('/children').then(r => {
      setChildren(r.data);
      if (r.data[0]) setChildId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!childId) return;
    api.get(`/children/${childId}/payments`).then(r => setPayments(r.data));
    api.get(`/children/${childId}/attendance`).then(r => setAttendance(r.data));
  }, [childId]);

  // Current month payment
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentPayment = payments.find(p => {
    const d = new Date(p.month);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const currentMonthLabel = `${MONTH_NAMES_GEN[now.getMonth()]} ${now.getFullYear()}`;

  // Sort payments by month descending for history
  const sortedPayments = [...payments].sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());

  // Get attendance breakdown for a specific payment month (for detail view)
  const getMonthBreakdown = (monthStr: string) => {
    const d = new Date(monthStr);
    const y = d.getFullYear();
    const m = d.getMonth();
    const monthAtt = attendance.filter(a => {
      const ad = new Date(a.date);
      return ad.getFullYear() === y && ad.getMonth() === m;
    });
    return {
      present: monthAtt.filter(a => a.status === 'present').length,
      sick: monthAtt.filter(a => a.status === 'sick').length,
      vacation: monthAtt.filter(a => a.status === 'vacation').length,
      absent: monthAtt.filter(a => a.status === 'absent').length,
      total: monthAtt.length,
    };
  };

  return (
    <PageLayout title="Оплата">
      {children.length > 1 && (
        <select value={childId} onChange={e => setChildId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm mb-6">
          {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      {/* Current month hero */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 mb-6 shadow-lg">
        <div className="text-indigo-200 text-sm">К оплате за {currentMonthLabel}</div>
        <div className="text-4xl font-bold mt-2">
          {currentPayment ? `${currentPayment.amount.toLocaleString()} ₽` : '—'}
        </div>
        {currentPayment && (
          <div className="mt-3">
            <span className={`inline-block text-xs font-medium px-3 py-1.5 rounded-full ${
              currentPayment.status === 'paid' ? 'bg-green-500/20 text-green-200' :
              currentPayment.status === 'debt' || currentPayment.status === 'overdue' ? 'bg-red-500/20 text-red-200' :
              'bg-yellow-500/20 text-yellow-200'
            }`}>
              {STATUS_LABELS[currentPayment.status] || currentPayment.status}
            </span>
          </div>
        )}
        {!currentPayment && (
          <div className="text-indigo-200 text-sm mt-2">Счёт за этот месяц ещё не выставлен</div>
        )}
      </div>

      {/* Info about calculation */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-xs text-blue-700">
        <strong>Как рассчитывается сумма:</strong> Базовая стоимость абонемента группы. Если ребёнок болел — скидка <strong>400 ₽/день</strong>. Если был в отпуске — скидка <strong>50%</strong> от дневной стоимости.
      </div>

      {/* Payment history */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h3 className="font-medium text-sm text-gray-700">История</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {sortedPayments.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">Нет данных по оплате</div>
          ) : sortedPayments.map(p => {
            const monthDate = new Date(p.month);
            const monthLabel = monthDate.toLocaleDateString('ru', { year: 'numeric', month: 'long' });
            return (
              <div key={p.id}>
                <button
                  onClick={() => setDetailPayment(detailPayment?.id === p.id ? null : p)}
                  className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div>
                    <div className="font-medium text-sm text-gray-900 capitalize">{monthLabel}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{p.amount.toLocaleString()} ₽</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                    <span className={`text-gray-400 text-xs transition-transform ${detailPayment?.id === p.id ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </button>

                {/* Detail breakdown */}
                {detailPayment?.id === p.id && (() => {
                  const bd = getMonthBreakdown(p.month);
                  return (
                    <div className="px-4 pb-4 bg-gray-50 border-t">
                      <h4 className="text-xs font-medium text-gray-500 uppercase mt-3 mb-2">Детализация</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                        <div className="bg-white border rounded-lg p-2 text-center">
                          <div className="text-sm font-bold text-green-600">{bd.present}</div>
                          <div className="text-[10px] text-gray-500">Присутствовал</div>
                        </div>
                        <div className="bg-white border rounded-lg p-2 text-center">
                          <div className="text-sm font-bold text-orange-600">{bd.sick}</div>
                          <div className="text-[10px] text-gray-500">Болезнь (−400₽)</div>
                        </div>
                        <div className="bg-white border rounded-lg p-2 text-center">
                          <div className="text-sm font-bold text-blue-600">{bd.vacation}</div>
                          <div className="text-[10px] text-gray-500">Отпуск (−50%)</div>
                        </div>
                        <div className="bg-white border rounded-lg p-2 text-center">
                          <div className="text-sm font-bold text-red-600">{bd.absent}</div>
                          <div className="text-[10px] text-gray-500">Пропуск</div>
                        </div>
                      </div>
                      <div className="bg-white border rounded-lg p-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-500">Скидка за болезнь:</span>
                          <span className="text-orange-600 font-medium">−{(bd.sick * 400).toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-500">Скидка за отпуск:</span>
                          <span className="text-blue-600 font-medium">рассчитывается индивидуально</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold border-t pt-2">
                          <span>Итого к оплате:</span>
                          <span>{p.amount.toLocaleString()} ₽</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}
