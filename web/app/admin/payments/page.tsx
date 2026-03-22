'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Child } from '@/lib/types';

interface Payment {
  id: string;
  child: { name: string; group?: { name: string } };
  month: string;
  amount: number;
  paid: number;
  status: 'pending' | 'paid' | 'overdue';
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800'
};

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    childId: '',
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    amount: 0,
    paid: 0,
    status: 'pending' as 'pending' | 'paid' | 'overdue'
  });

  const [saving, setSaving] = useState(false);

  const reload = () => api.get('/admin/payments').then(r => setPayments(r.data));

  useEffect(() => {
    reload();
    api.get('/admin/children').then(r => setChildren(r.data));
  }, []);

  const createPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Add "-01" to the month string so parseable by Date constructor as start of month
      const monthDate = form.month + '-01'; 
      await api.post('/admin/payments', { ...form, month: monthDate });
      setShowForm(false);
      setForm({
        childId: '',
        month: new Date().toISOString().slice(0, 7),
        amount: 0,
        paid: 0,
        status: 'pending'
      });
      reload();
    } catch (err: unknown) {
      alert('Ошибка при создании: ' + (err instanceof Error ? err.message : 'Неизвестная ошибка'));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await api.put(`/admin/payments/${id}`, { status: newStatus });
      reload();
    } catch {
      alert('Ошибка обновления статуса');
    }
  };

  const updatePaid = async (id: string, newPaid: number) => {
    try {
      await api.put(`/admin/payments/${id}`, { paid: newPaid });
      reload();
    } catch {
      alert('Ошибка обновления суммы');
    }
  };

  return (
    <PageLayout title="Учёт оплаты">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Все платежи</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          + Создать счет
        </button>
      </div>

      {showForm && (
        <form onSubmit={createPayment} className="bg-white border rounded-xl p-6 mb-6">
          <h3 className="font-medium text-lg mb-4">Новый счет</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ребёнок</label>
              <select 
                required
                value={form.childId} 
                onChange={e => setForm(p => ({...p, childId: e.target.value}))}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="" disabled>Выберите ребёнка</option>
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Месяц</label>
              <input 
                type="month" 
                required
                value={form.month}
                onChange={e => setForm(p => ({...p, month: e.target.value}))}
                className="w-full border rounded-lg px-3 py-2" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Сумма (₽)</label>
              <input 
                type="number" 
                required min="0"
                value={form.amount}
                onChange={e => setForm(p => ({...p, amount: Number(e.target.value)}))}
                className="w-full border rounded-lg px-3 py-2" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
              <select 
                value={form.status} 
                onChange={e => setForm(p => ({...p, status: e.target.value as 'pending' | 'paid' | 'overdue'}))}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="pending">Ожидает</option>
                <option value="paid">Оплачено</option>
                <option value="overdue">Просрочено</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 rounded-lg border hover:bg-gray-50 text-gray-700">
              Отмена
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Месяц</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ребёнок</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма к оплате</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Оплачено</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Счета не найдены</td></tr>
            ) : payments.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {new Date(p.month).toLocaleDateString('ru', { year: 'numeric', month: 'long' })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {p.child?.name}
                  <div className="text-xs text-gray-500">{p.child?.group?.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {p.amount.toLocaleString()} ₽
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <input 
                    type="number" 
                    defaultValue={p.paid}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      if (val !== p.paid) updatePaid(p.id, val);
                    }}
                    className="border rounded px-2 py-1 w-24 text-sm"
                  />
                  {' '}₽
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <select 
                    value={p.status}
                    onChange={(e) => updateStatus(p.id, e.target.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium appearance-none cursor-pointer outline-none border-0 ${STATUS_COLORS[p.status]}`}
                  >
                    <option value="pending">Ожидает оплаты</option>
                    <option value="paid">Оплачено</option>
                    <option value="overdue">Просрочено</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageLayout>
  );
}
