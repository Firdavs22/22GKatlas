'use client';
import { useState, useEffect } from 'react';
import { Download, CalendarCheck, BarChart3, Wallet } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import { Card, Button } from '@/components/ui';
import api from '@/lib/api';
import { Group } from '@/lib/types';

type ReportType = 'attendance' | 'progress' | 'payments';

const inputCls =
  'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export default function AdminReports() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [groupId, setGroupId] = useState('all');
  const [loading, setLoading] = useState<ReportType | null>(null);

  useEffect(() => {
    api.get('/admin/groups').then(r => setGroups(r.data));
  }, []);

  const download = async (type: ReportType) => {
    setLoading(type);
    try {
      let url = `/admin/reports/${type}`;
      if (type === 'attendance' || type === 'payments') {
        url += `?month=${month}`;
      } else if (type === 'progress') {
        url += `?groupId=${groupId}`;
      }
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `report_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch {
      alert('Ошибка при генерации отчёта');
    } finally {
      setLoading(null);
    }
  };

  return (
    <PageLayout eyebrow="Аналитика и выгрузки" title="Отчёты">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Card padding="md" className="flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-brand-pale flex items-center justify-center text-brand mb-3">
            <CalendarCheck size={18} />
          </div>
          <h3 className="font-serif text-xl mb-2">Посещаемость</h3>
          <p className="text-sm text-slate-500 mb-4 flex-1">
            Детальная таблица посещаемости всех детей за выбранный месяц.
          </p>
          <div className="mb-4">
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
          <Button
            variant="subtle"
            onClick={() => download('attendance')}
            disabled={loading === 'attendance'}
            className="w-full"
          >
            <Download size={16} />
            {loading === 'attendance' ? 'Генерация…' : 'Скачать Excel'}
          </Button>
        </Card>

        <Card padding="md" className="flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-brand-pale flex items-center justify-center text-brand mb-3">
            <BarChart3 size={18} />
          </div>
          <h3 className="font-serif text-xl mb-2">Прогресс</h3>
          <p className="text-sm text-slate-500 mb-4 flex-1">
            Выгрузка всех текущих стадий навыков по детям. Можно ограничить группой.
          </p>
          <div className="mb-4">
            <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1">
              Группа
            </label>
            <select
              value={groupId}
              onChange={e => setGroupId(e.target.value)}
              className={inputCls}
            >
              <option value="all">Все группы</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <Button
            variant="subtle"
            onClick={() => download('progress')}
            disabled={loading === 'progress'}
            className="w-full"
          >
            <Download size={16} />
            {loading === 'progress' ? 'Генерация…' : 'Скачать Excel'}
          </Button>
        </Card>

        <Card padding="md" className="flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-brand-pale flex items-center justify-center text-brand mb-3">
            <Wallet size={18} />
          </div>
          <h3 className="font-serif text-xl mb-2">Оплаты</h3>
          <p className="text-sm text-slate-500 mb-4 flex-1">
            Статусы оплат по каждому ребёнку за указанный месяц.
          </p>
          <div className="mb-4">
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
          <Button
            variant="subtle"
            onClick={() => download('payments')}
            disabled={loading === 'payments'}
            className="w-full"
          >
            <Download size={16} />
            {loading === 'payments' ? 'Генерация…' : 'Скачать Excel'}
          </Button>
        </Card>
      </div>
    </PageLayout>
  );
}
