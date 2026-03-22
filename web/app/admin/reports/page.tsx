'use client';
import { useState, useEffect } from 'react';
import PageLayout from '@/components/PageLayout';
import api from '@/lib/api';
import { Group } from '@/lib/types';

export default function AdminReports() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7));
  const [groupId, setGroupId] = useState('all');
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    api.get('/admin/groups').then(r => setGroups(r.data));
  }, []);

  const downloadReport = async (type: string) => {
    setLoading(type);
    try {
      let url = `/admin/reports/${type}`;
      if (type === 'attendance' || type === 'payments') {
        url += `?month=${month}`;
      } else if (type === 'progress') {
        url += `?groupId=${groupId}`;
      }

      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `report_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Ошибка при скачивании отчета:', error);
      alert('Ошибка при генерации отчета');
    } finally {
      setLoading(null);
    }
  };

  return (
    <PageLayout title="Отчёты и экспорт">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Посещаемость */}
        <div className="bg-white border rounded-xl p-6 flex flex-col">
          <h3 className="text-lg font-medium mb-2">Посещаемость</h3>
          <p className="text-sm text-gray-500 mb-4">Детальная таблица посещаемости всех детей за выбранный месяц.</p>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Месяц</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="mt-auto">
            <button 
              onClick={() => downloadReport('attendance')} 
              disabled={loading === 'attendance'}
              className="w-full bg-indigo-50 text-indigo-700 font-medium py-2 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              {loading === 'attendance' ? 'Генерация...' : 'Скачать Excel'}
            </button>
          </div>
        </div>

        {/* Прогресс */}
        <div className="bg-white border rounded-xl p-6 flex flex-col">
          <h3 className="text-lg font-medium mb-2">Общий прогресс</h3>
          <p className="text-sm text-gray-500 mb-4">Выгрузка всех текущих стадий навыков по детям (можно по конкретной группе).</p>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Группа</label>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="all">Все группы</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-auto">
            <button 
              onClick={() => downloadReport('progress')} 
              disabled={loading === 'progress'}
              className="w-full bg-indigo-50 text-indigo-700 font-medium py-2 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              {loading === 'progress' ? 'Генерация...' : 'Скачать Excel'}
            </button>
          </div>
        </div>

        {/* Оплаты */}
        <div className="bg-white border rounded-xl p-6 flex flex-col">
          <h3 className="text-lg font-medium mb-2">Оплаты</h3>
          <p className="text-sm text-gray-500 mb-4">Статусы оплат по каждому ребёнку за указанный месяц.</p>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Месяц</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="mt-auto">
            <button 
              onClick={() => downloadReport('payments')} 
              disabled={loading === 'payments'}
              className="w-full bg-indigo-50 text-indigo-700 font-medium py-2 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              {loading === 'payments' ? 'Генерация...' : 'Скачать Excel'}
            </button>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
