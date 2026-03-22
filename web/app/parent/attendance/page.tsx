'use client';
import { useEffect, useState } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Child } from '@/lib/types';

interface Attendance { id: string; date: string; status: string; }
interface Payment { id: string; month: string; status: string; amount: number; paid: number; }

const STATUS_LABELS: Record<string, string> = { present: 'Присутствует', sick: 'Болеет', vacation: 'Отпуск', absent: 'Отсутствует' };

export default function ParentAttendance() {
  const [children, setChildren] = useState<Child[]>([]);
  const [childId, setChildId] = useState('');
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => { api.get('/children').then(r => { setChildren(r.data); if (r.data[0]) setChildId(r.data[0].id); }); }, []);
  useEffect(() => {
    if (!childId) return;
    api.get(`/children/${childId}/attendance`).then(r => setAttendance(r.data));
    api.get(`/children/${childId}/payments`).then(r => setPayments(r.data));
  }, [childId]);

  return (
    <PageLayout title="Посещаемость и оплата">
      {children.length > 1 && (
        <select value={childId} onChange={e => setChildId(e.target.value)} className="border rounded-lg px-3 py-2 mb-4">
          {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-3">Посещаемость</h2>
          <div className="space-y-1">
            {attendance.slice(0, 20).map(a => (
              <div key={a.id} className="flex justify-between text-sm bg-white border rounded-lg p-2">
                <span>{new Date(a.date).toLocaleDateString('ru')}</span>
                <span className="text-gray-500">{STATUS_LABELS[a.status] || a.status}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-3">Оплата</h2>
          <div className="space-y-2">
            {payments.map(p => (
              <div key={p.id} className="bg-white border rounded-xl p-3">
                <div className="flex justify-between font-medium">
                  <span>{new Date(p.month).toLocaleDateString('ru', { year: 'numeric', month: 'long' })}</span>
                  <span className={p.status === 'paid' ? 'text-green-600' : 'text-orange-500'}>{p.status === 'paid' ? 'Оплачено' : 'Ожидает'}</span>
                </div>
                <div className="text-sm text-gray-500">{p.paid.toLocaleString()} / {p.amount.toLocaleString()} ₽</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
